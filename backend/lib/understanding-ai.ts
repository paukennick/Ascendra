import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { callClaudeStructured, getFastModel } from "@/lib/anthropic";
import { coachContextForObjective, coachContextForTrack } from "@/lib/coach-context";
import { queryOne } from "@/lib/db";
import { factCheckGate, type CheckItem } from "@/lib/fact-check";
import { recordHoldback, uncertaintyOf } from "@/lib/item-quality";
import type { CoachContext } from "@/lib/coach-context";
import {
  type CleanConceptSet,
  cleanConceptSets,
  cleanPrerequisites,
  type RawConceptSet,
} from "@/lib/understanding";
import {
  conceptSetSchema,
  conceptSetsPrompt,
  conceptSetsSchema,
  explainBackGradePrompt,
  explainBackGradeSchema,
  learnedSetPrompt,
  prerequisiteMapPrompt,
  prerequisiteMapSchema,
  type ExplainBackGrade,
} from "@/lib/understanding-prompts";
import {
  claimInsight,
  claimLearnedSet,
  courseObjectives,
  existingSetKeys,
  finishInsight,
  insightStatus,
  learnedSetCandidates,
  saveConceptSets,
  saveGeneratedPrerequisites,
  type InsightKind,
} from "@/lib/understanding-store";

// REQ-111: every model call the deep-understanding features make. All of them
// use the fast model with thinking off:
//   concept_sets   once per course (shared by every learner of it)
//   prereq_map     once per course (shared)
//   learned_set    once per (objective, confused idea) shown by 3+ learners
//   explain_back   once per explanation a learner submits
// Multiple-choice misconception diagnosis makes no call at all
// (lib/understanding.ts diagnoseMcMiss), and free-response lesson grading
// returns its misconception tag from the grading call it already makes.

// Runs `work` after the response is sent (Next's after(), which keeps the
// function alive for it). Outside a request -- scripts and tests calling a
// route handler directly -- after() throws, so the work just starts now and is
// not awaited. Errors are swallowed: background generation is best effort.
export function inBackground(work: () => Promise<unknown>): void {
  try {
    after(() => work().catch(() => undefined));
  } catch {
    void work().catch(() => undefined);
  }
}

export type InsightState = "none" | "generating" | "ready" | "failed";

async function runOnce(
  trackId: string,
  kind: InsightKind,
  work: (model: string) => Promise<void>
): Promise<InsightState> {
  const token = randomUUID();
  if (!(await claimInsight(trackId, kind, token))) return insightStatus(trackId, kind);
  const model = getFastModel();
  try {
    await work(model);
    await finishInsight(trackId, kind, token, "ready", model);
    return "ready";
  } catch (err) {
    await finishInsight(trackId, kind, token, "failed", model).catch(() => undefined);
    // eslint-disable-next-line no-console
    console.warn(`[understanding] ${kind} generation failed for ${trackId}:`, (err as Error).message);
    return "failed";
  }
}

// The course's comparison cards, generated on first need. Returns at once
// with the current state when another request holds the claim.
export async function ensureConceptSets(trackId: string): Promise<InsightState> {
  const state = await insightStatus(trackId, "concept_sets");
  if (state === "ready") return state;
  return runOnce(trackId, "concept_sets", async (model) => {
    const objectives = await courseObjectives(trackId);
    if (objectives.length < 2) return;
    const track = await queryOne<{ title: string }>(`select title from subject_tracks where id = $1`, [trackId]);
    const ctx = (await coachContextForTrack(trackId)) ?? undefined;
    const { system, user } = conceptSetsPrompt({
      trackTitle: track?.title ?? "",
      objectives: objectives.map((o) => ({ unit: o.unit_title, title: o.title })),
      ctx,
    });
    const out = await callClaudeStructured({
      system,
      messages: [{ role: "user", content: user }],
      schema: conceptSetsSchema,
      maxTokens: 8000,
      model,
      effort: "medium",
      thinking: "off",
      purpose: "concept_sets",
    });
    const kept = await holdUncertainSets(trackId, out.sets as RawConceptSet[], model);
    const clean = cleanConceptSets(kept, objectives.map((o) => o.id), await existingSetKeys(trackId));
    await saveConceptSets(trackId, await gateConceptSets(trackId, clean, ctx, model), "generated", model);
  });
}

// Learned cards: at most `limit` per call, each (objective, idea) tried once
// ever (learned_set_attempts), so the cost is bounded by distinct confusions
// that 3+ learners share, not by traffic.
export async function generateLearnedSets(trackId: string, limit = 1): Promise<number> {
  const candidates = await learnedSetCandidates(trackId);
  let made = 0;
  for (const c of candidates) {
    if (made >= limit) break;
    if (!(await claimLearnedSet(trackId, c.objectiveId, c.confusedWith))) continue;
    made++;
    try {
      const track = await queryOne<{ title: string }>(`select title from subject_tracks where id = $1`, [trackId]);
      const ctx = (await coachContextForObjective(c.objectiveId)) ?? undefined;
      const model = getFastModel();
      const { system, user } = learnedSetPrompt({
        trackTitle: track?.title ?? "",
        objectiveTitle: c.objectiveTitle,
        confusedWith: [c.confusedWith],
        ctx,
      });
      const out = await callClaudeStructured({
        system,
        messages: [{ role: "user", content: user }],
        schema: conceptSetSchema,
        maxTokens: 2500,
        model,
        effort: "medium",
        thinking: "off",
        purpose: "learned_set",
      });
      // objectiveNumber 1 is this objective; any other number means "none".
      const kept = await holdUncertainSets(trackId, [out as RawConceptSet], model);
      const clean = cleanConceptSets(kept, [c.objectiveId], await existingSetKeys(trackId));
      await saveConceptSets(trackId, await gateConceptSets(trackId, clean, ctx, model), "learned", model);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[understanding] learned set failed for ${c.objectiveId}:`, (err as Error).message);
    }
  }
  return made;
}

// REQ-114 (Audit 3 H1): a comparison card whose writer listed uncertain
// claims is never saved; logged in item_holdbacks instead.
async function holdUncertainSets(trackId: string, sets: RawConceptSet[], model: string): Promise<RawConceptSet[]> {
  const kept: RawConceptSet[] = [];
  for (const s of sets ?? []) {
    const unsure = uncertaintyOf(s as RawConceptSet & { confidence?: unknown; uncertainClaims?: unknown });
    if (unsure) await recordHoldback({ kind: "comparison", trackId, reason: "uncertain", claims: unsure, content: s, model });
    else kept.push(s);
  }
  return kept;
}

// Scenarios per fact-check call: the course-level generation can write up
// to 12 cards x 6 scenarios, more than one short call should answer.
const GATE_BATCH = 20;

// REQ-114 (recommendation 1): every scenario of every new card is answered
// by an independent fast-model call without the key; a scenario it does not
// agree with is dropped, and a card left with fewer than two is held back
// whole (logged). One call per GATE_BATCH scenarios, once per course.
export async function gateConceptSets(
  trackId: string,
  sets: CleanConceptSet[],
  ctx: CoachContext | undefined,
  model: string
): Promise<CleanConceptSet[]> {
  const items: CheckItem[] = [];
  sets.forEach((s, si) =>
    s.scenarios.forEach((q, qi) =>
      items.push({
        key: `s${si}q${qi}`,
        objectiveTitle: s.concepts.map((c) => c.name).join(" vs "),
        question: `Which concept fits this scenario? ${q.scenario}`,
        format: "single",
        options: s.concepts.map((c) => c.name),
        expected: [q.answerPosition],
      })
    )
  );
  const verdicts = new Map<string, { publish: boolean; claims: string[]; error: string | null }>();
  for (let i = 0; i < items.length; i += GATE_BATCH) {
    const gate = await factCheckGate(items.slice(i, i + GATE_BATCH), { ctx });
    for (const it of items.slice(i, i + GATE_BATCH)) {
      const v = gate.verdicts.get(it.key);
      verdicts.set(it.key, { publish: !!v?.publish, claims: v?.unsupportedClaims ?? [], error: gate.error });
    }
  }
  const out: CleanConceptSet[] = [];
  for (const [si, s] of sets.entries()) {
    const failed = s.scenarios.filter((_, qi) => !verdicts.get(`s${si}q${qi}`)?.publish);
    const scenarios = s.scenarios.filter((_, qi) => verdicts.get(`s${si}q${qi}`)?.publish);
    if (failed.length) {
      const errs = s.scenarios.map((_, qi) => verdicts.get(`s${si}q${qi}`)).filter((v) => v && !v.publish);
      await recordHoldback({
        kind: "comparison",
        trackId,
        reason: errs.some((v) => v?.error) ? "fact_check_error" : "fact_check",
        claims: errs.flatMap((v) => (v?.error ? [v.error] : v?.claims ?? [])),
        content: { set: s.key, scenarios: failed, keptScenarios: scenarios.length },
        model,
      });
    }
    if (scenarios.length >= 2) out.push({ ...s, scenarios });
  }
  return out;
}

// The course's prerequisite map, generated on first need.
export async function ensurePrerequisites(trackId: string): Promise<InsightState> {
  const state = await insightStatus(trackId, "prerequisites");
  if (state === "ready") return state;
  return runOnce(trackId, "prerequisites", async (model) => {
    const objectives = await courseObjectives(trackId);
    if (objectives.length < 2) return;
    const track = await queryOne<{ title: string }>(`select title from subject_tracks where id = $1`, [trackId]);
    const ctx = (await coachContextForTrack(trackId)) ?? undefined;
    const { system, user } = prerequisiteMapPrompt({
      trackTitle: track?.title ?? "",
      objectives: objectives.map((o) => ({ unit: o.unit_title, title: o.title })),
      ctx,
    });
    const out = await callClaudeStructured({
      system,
      messages: [{ role: "user", content: user }],
      schema: prerequisiteMapSchema,
      maxTokens: 4000,
      model,
      effort: "medium",
      thinking: "off",
      purpose: "prereq_map",
    });
    // The prompt numbers objectives from 1.
    const edges = cleanPrerequisites(
      (out.edges ?? []).map((e) => ({ objective: e.objective - 1, prerequisite: e.prerequisite - 1 })),
      objectives.length
    );
    await saveGeneratedPrerequisites(
      trackId,
      edges.map((e) => ({ objectiveId: objectives[e.objective].id, prerequisiteId: objectives[e.prerequisite].id }))
    );
  });
}

export async function gradeExplainBack(params: {
  objectiveId: string;
  objectiveTitle: string;
  teach: string;
  question: string;
  answer: string;
  userId: string;
}): Promise<ExplainBackGrade> {
  const ctx = (await coachContextForObjective(params.objectiveId)) ?? undefined;
  const { system, user } = explainBackGradePrompt({ ...params, ctx });
  return callClaudeStructured({
    system,
    messages: [{ role: "user", content: user }],
    schema: explainBackGradeSchema,
    maxTokens: 900,
    model: getFastModel(),
    effort: "high",
    thinking: "off",
    purpose: "explain_back",
    userId: params.userId,
  });
}
