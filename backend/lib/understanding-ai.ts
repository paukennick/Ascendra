import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { callClaudeStructured, getFastModel } from "@/lib/anthropic";
import { canAffordAiSpend } from "@/lib/ai-spend-gate";
import { estimateCall } from "@/lib/ai-spend-ledger";
import type { AiPurpose } from "@/lib/ai-calls";
import type { CoachContext } from "@/lib/coach-context";
import { reconciled, trivialAnswer, trivialGrade } from "@/lib/grade-consistency";
import { coachContextForObjective, coachContextForTrack } from "@/lib/coach-context";
import { queryOne } from "@/lib/db";
import { factCheckGate, verdictClaims, verdictHolds, verdictUnchecked, type CheckItem } from "@/lib/fact-check";
import { lowConfidenceOf, noteListedClaims, recordHoldback } from "@/lib/item-quality";
import { steerText } from "@/lib/generation-gate";
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

// REQ-202: a rough price of one of these once-per-course generations (the
// answer at its largest max_tokens, 8,000), for the look-before-claiming
// below. The model call itself reserves its own exact worst case.
function insightEstimateUsd(): number {
  return estimateCall(getFastModel(), { max_tokens: 8000 }).usd;
}

// `userId` is the learner whose request starts the generation (or null from
// a script): the work is charged to them (REQ-202). A learner who cannot
// afford it does not take the claim, so the course's map is not marked
// failed, or a learned card spent, by someone else's empty budget.
async function runOnce(
  trackId: string,
  kind: InsightKind,
  userId: string | null,
  work: (model: string) => Promise<void>
): Promise<InsightState> {
  if (userId && !(await canAffordAiSpend(userId, kind === "prerequisites" ? "prereq_map" : "concept_sets", insightEstimateUsd()))) {
    return insightStatus(trackId, kind);
  }
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
export async function ensureConceptSets(trackId: string, userId: string | null): Promise<InsightState> {
  const state = await insightStatus(trackId, "concept_sets");
  if (state === "ready") return state;
  return runOnce(trackId, "concept_sets", userId, async (model) => {
    const objectives = await courseObjectives(trackId);
    if (objectives.length < 2) return;
    const track = await queryOne<{ title: string }>(`select title from subject_tracks where id = $1`, [trackId]);
    const ctx = (await coachContextForTrack(trackId)) ?? undefined;
    const { system, user } = conceptSetsPrompt({
      trackTitle: track?.title ?? "",
      objectives: objectives.map((o) => ({ unit: o.unit_title, title: o.title })),
      ctx,
    });
    const attempt = async (steer: string | null) => {
      const out = await callClaudeStructured({
        system,
        messages: [{ role: "user", content: steer ? `${user}\n\n${steer}` : user }],
        schema: conceptSetsSchema,
        maxTokens: 8000,
        model,
        effort: "medium",
        thinking: "off",
        purpose: "concept_sets",
        userId,
      });
      const kept = await holdUncertainSets(trackId, out.sets as RawConceptSet[], model);
      const clean = cleanConceptSets(kept.kept, objectives.map((o) => o.id), await existingSetKeys(trackId));
      const gated = await gateConceptSets(trackId, clean, ctx, model);
      const saved = await saveConceptSets(trackId, gated.kept, "generated", model);
      return { saved: saved.length, held: kept.held + gated.held, errored: gated.errored, claims: [...kept.claims, ...gated.claims] };
    };
    let r = await attempt(null);
    // REQ-216 (H2): when every card was held back, the course's cards are
    // written once more, steered with what held the first draft back. (Not
    // when the checker itself failed: that is retried on the next visit.)
    if (!r.saved && r.held && !r.errored) r = await attempt(steerText(r.claims));
    // FAIL-1011: nothing saved and something held back or unchecked used to
    // finish as "ready" with no cards, and was never tried again (production:
    // 4 of 4 cards held). It now finishes "failed", which a later visit retries.
    if (!r.saved && (r.held || r.errored)) {
      throw new Error(`no comparison card was saved (${r.held} held back, ${r.errored} not checked)`);
    }
  });
}

// Learned cards: at most `limit` per call, each (objective, idea) tried once
// ever (learned_set_attempts), so the cost is bounded by distinct confusions
// that 3+ learners share, not by traffic.
export async function generateLearnedSets(trackId: string, userId: string | null, limit = 1): Promise<number> {
  const candidates = await learnedSetCandidates(trackId);
  let made = 0;
  for (const c of candidates) {
    if (made >= limit) break;
    // REQ-202: each (objective, idea) is tried once ever, so look before
    // claiming one this learner cannot afford.
    if (userId && !(await canAffordAiSpend(userId, "learned_set", insightEstimateUsd()))) break;
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
        userId,
      });
      // objectiveNumber 1 is this objective; any other number means "none".
      const kept = await holdUncertainSets(trackId, [out as RawConceptSet], model);
      const clean = cleanConceptSets(kept.kept, [c.objectiveId], await existingSetKeys(trackId));
      await saveConceptSets(trackId, (await gateConceptSets(trackId, clean, ctx, model)).kept, "learned", model);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[understanding] learned set failed for ${c.objectiveId}:`, (err as Error).message);
    }
  }
  return made;
}

// REQ-114 (Audit 3 H1), changed by REQ-216: a comparison card is held back
// (logged in item_holdbacks, never saved) only when its writer rated it LOW;
// claims it merely lists are logged. Production held 4 of 4 for disclaimers.
async function holdUncertainSets(
  trackId: string,
  sets: RawConceptSet[],
  model: string
): Promise<{ kept: RawConceptSet[]; held: number; claims: string[] }> {
  const kept: RawConceptSet[] = [];
  const claims: string[] = [];
  let held = 0;
  for (const s of sets ?? []) {
    const unsure = lowConfidenceOf(s as RawConceptSet & { confidence?: unknown; uncertainClaims?: unknown });
    if (unsure) {
      held++;
      claims.push(...unsure);
      await recordHoldback({ kind: "comparison", trackId, reason: "uncertain", claims: unsure, content: s, model });
    } else {
      noteListedClaims(`comparison (${trackId})`, s as RawConceptSet & { confidence?: unknown; uncertainClaims?: unknown });
      kept.push(s);
    }
  }
  return { kept, held, claims };
}

// Scenarios per fact-check call: the course-level generation can write up
// to 12 cards x 6 scenarios, more than one short call should answer.
const GATE_BATCH = 20;

// REQ-114 (recommendation 1): every scenario of every new card is answered
// by an independent call without the key; a scenario it DISAGREES with is
// dropped (REQ-216: claims it lists while agreeing are logged), and a card
// left with fewer than two is held back whole (logged). A scenario the check
// could not answer (the call failed) is dropped without a holdback: it says
// nothing about the scenario. One call per GATE_BATCH scenarios, once per
// course.
export async function gateConceptSets(
  trackId: string,
  sets: CleanConceptSet[],
  ctx: CoachContext | undefined,
  model: string
): Promise<{ kept: CleanConceptSet[]; held: number; errored: number; claims: string[] }> {
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
  type V = { state: "ok" | "hold" | "unchecked"; claims: string[] };
  const verdicts = new Map<string, V>();
  for (let i = 0; i < items.length; i += GATE_BATCH) {
    const gate = await factCheckGate(items.slice(i, i + GATE_BATCH), { ctx });
    for (const it of items.slice(i, i + GATE_BATCH)) {
      const v = gate.verdicts.get(it.key);
      if (gate.error || verdictUnchecked(v)) verdicts.set(it.key, { state: "unchecked", claims: [] });
      else if (verdictHolds(v)) verdicts.set(it.key, { state: "hold", claims: verdictClaims(v) });
      else {
        if (v?.unsupportedClaims.length) {
          // eslint-disable-next-line no-console
          console.warn(`[item-quality] comparison (${trackId}) scenario agreed with the key; checker could not confirm: ${v.unsupportedClaims.join(" | ").slice(0, 500)}`);
        }
        verdicts.set(it.key, { state: "ok", claims: [] });
      }
    }
  }
  const out: CleanConceptSet[] = [];
  let held = 0;
  let errored = 0;
  const claims: string[] = [];
  for (const [si, s] of sets.entries()) {
    const states = s.scenarios.map((_, qi) => verdicts.get(`s${si}q${qi}`) ?? { state: "unchecked" as const, claims: [] });
    const scenarios = s.scenarios.filter((_, qi) => states[qi].state === "ok");
    const heldHere = states.filter((v) => v.state === "hold");
    errored += states.filter((v) => v.state === "unchecked").length;
    if (heldHere.length) {
      held += heldHere.length;
      claims.push(...heldHere.flatMap((v) => v.claims));
      await recordHoldback({
        kind: "comparison",
        trackId,
        reason: "fact_check",
        claims: heldHere.flatMap((v) => v.claims),
        content: { set: s.key, scenarios: s.scenarios.filter((_, qi) => states[qi].state === "hold"), keptScenarios: scenarios.length },
        model,
      });
    }
    if (scenarios.length >= 2) out.push({ ...s, scenarios });
  }
  return { kept: out, held, errored, claims };
}

// The course's prerequisite map, generated on first need.
export async function ensurePrerequisites(trackId: string, userId: string | null): Promise<InsightState> {
  const state = await insightStatus(trackId, "prerequisites");
  if (state === "ready") return state;
  return runOnce(trackId, "prerequisites", userId, async (model) => {
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
      userId,
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

// Audit 3 L1 (FAIL-305): verdict, feedback, four rubric checks, a model
// answer and a misconception used to share 900 output tokens; a long answer
// could truncate, fail to parse and show a 500 after the call was billed.
export const EXPLAIN_BACK_MAX_TOKENS = 1500;

export async function gradeExplainBack(params: {
  objectiveId: string;
  objectiveTitle: string;
  teach: string;
  question: string;
  answer: string;
  userId: string;
  // Only the live eval sets these.
  ctx?: CoachContext;
  model?: string;
  purpose?: AiPurpose;
}): Promise<ExplainBackGrade> {
  // Audit 3 M1: a trivial explanation is incorrect without a model call, and
  // a "correct" that the rubric contradicts is downgraded.
  const trivial = trivialAnswer(params.answer, { question: params.question });
  if (trivial) {
    const { trivial: _r, ...g } = trivialGrade(trivial);
    return {
      ...g,
      modelAnswer: g.modelAnswer ?? "",
      fixNext: g.fixNext ?? "",
      rubric: { correct: false, complete: false, keyTerms: false, noMisconception: false },
      misconception: "",
      confusedWith: "",
    };
  }
  const ctx = params.ctx ?? (await coachContextForObjective(params.objectiveId)) ?? undefined;
  const { system, user } = explainBackGradePrompt({
    objectiveTitle: params.objectiveTitle,
    teach: params.teach,
    question: params.question,
    answer: params.answer,
    ctx,
  });
  const graded = await callClaudeStructured({
    system,
    messages: [{ role: "user", content: user }],
    schema: explainBackGradeSchema,
    maxTokens: EXPLAIN_BACK_MAX_TOKENS,
    model: params.model ?? getFastModel(),
    effort: "high",
    thinking: "off",
    purpose: params.purpose ?? "explain_back",
    userId: params.userId,
  });
  return reconciled(graded, { missedParts: graded.missedParts, rubric: graded.rubric });
}
