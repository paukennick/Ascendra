import { callClaudeStructured, getFastModel } from "@/lib/anthropic";
import { gradePBQPrompt, normalizePartScores, pbqGradeResultSchema, type PartResult, type PbqGradeResult } from "@/lib/prompts";
import { reconciled, trivialAnswer, trivialGrade } from "@/lib/grade-consistency";
import type { CoachContext } from "@/lib/coach-context";
import type { AiPurpose } from "@/lib/ai-calls";

// The one place a multi-part (PBQ-style) answer is graded: POST /api/pbq,
// the unit gate check (lib/unit-check.ts) and the live eval
// (scripts/eval/live.ts) all call this, so the eval measures what runs.
//
// Audit 3 M1: a trivial answer is incorrect with every part missed and no
// model call; a "correct" that the per-part scores or missedParts contradict
// is downgraded (lib/grade-consistency.ts).
// Audit 3 L1 (FAIL-305): the unit check used to reuse the PBQ prompt (which
// asks for per-part scores) with a schema that had no per-part field and a
// 900-token cap, so a long answer could truncate after the call was billed.
// Both now use pbqGradeResultSchema and 1,500 tokens.
export const PBQ_GRADE_MAX_TOKENS = 1500;

export interface PbqGraded extends PbqGradeResult {
  partScores: PartResult[] | null;
  trivial?: string;
}

export async function gradePbqAnswer(params: {
  scenario: string;
  subParts: string[];
  answer: string;
  revisionOf?: string[];
  ctx?: CoachContext;
  userId: string | null;
  purpose: AiPurpose;
  model?: string;
}): Promise<PbqGraded> {
  const graded = params.revisionOf?.length ? params.revisionOf : params.subParts;
  const trivial = trivialAnswer(params.answer, { question: params.scenario });
  if (trivial) {
    const g = trivialGrade(trivial, graded);
    const parts = graded.map((part) => ({ part, score: "missed" as const, comment: "" }));
    return {
      ...g,
      modelAnswer: "",
      fixNext: g.fixNext ?? "",
      parts,
      partScores: normalizePartScores(params.subParts, parts, graded),
    };
  }
  const { system, user } = gradePBQPrompt({
    scenario: params.scenario,
    subParts: params.subParts,
    answer: params.answer,
    revisionOf: params.revisionOf,
    ctx: params.ctx,
  });
  const out = await callClaudeStructured({
    system,
    messages: [{ role: "user", content: user }],
    schema: pbqGradeResultSchema,
    // REQ-105: +300 headroom for the model answer (one line per sub-part)
    // and fixNext; REQ-107: +300 for the per-part scores. max_tokens is a
    // ceiling, not a cost.
    maxTokens: PBQ_GRADE_MAX_TOKENS,
    model: params.model ?? getFastModel(),
    effort: "high",
    thinking: "off",
    purpose: params.purpose,
    userId: params.userId,
  });
  // REQ-107: a score per sub-part, lined up with the scenario's own labels
  // (null when the grader's list can't be matched).
  const partScores = normalizePartScores(params.subParts, out.parts, out.missedParts ?? []);
  return { ...reconciled(out, { missedParts: out.missedParts, partScores: partScores ?? out.parts }), partScores };
}
