import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { callClaudeStructured, getFastModel } from "@/lib/anthropic";
import type { AiPurpose } from "@/lib/ai-calls";
import type { CoachContext } from "@/lib/coach-context";
import { reconciled, trivialAnswer, trivialGrade } from "@/lib/grade-consistency";
import { coachContextForObjective, coachContextForTrack } from "@/lib/coach-context";
import { queryOne } from "@/lib/db";
import {
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
    const clean = cleanConceptSets(out.sets as RawConceptSet[], objectives.map((o) => o.id), await existingSetKeys(trackId));
    await saveConceptSets(trackId, clean, "generated", model);
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
      const clean = cleanConceptSets([out as RawConceptSet], [c.objectiveId], await existingSetKeys(trackId));
      await saveConceptSets(trackId, clean, "learned", model);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[understanding] learned set failed for ${c.objectiveId}:`, (err as Error).message);
    }
  }
  return made;
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
