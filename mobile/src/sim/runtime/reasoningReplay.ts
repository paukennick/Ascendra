// REQ-217 (FAIL-1050): the server answers a second submit of a reasoning
// moment that was already graded -- the first answer's response was lost, or
// another device answered it -- with 409 { code: "already_graded", result }
// where `result` is the graded answer (backend/lib/sims.ts). The app showed the
// error text and left the learner on a box that can never be submitted. The
// result is the answer they were waiting for: this returns it.
import type { ReasoningResult } from "../useSimRun.ts";

export function alreadyGradedResult(err: unknown): ReasoningResult | null {
  if (!err || typeof err !== "object") return null;
  const e = err as { status?: unknown; data?: unknown };
  if (e.status !== 409 || !e.data || typeof e.data !== "object") return null;
  const d = e.data as { code?: unknown; result?: unknown };
  if (d.code !== "already_graded" || !d.result || typeof d.result !== "object") return null;
  const r = d.result as Partial<ReasoningResult>;
  if (typeof r.momentId !== "string" || typeof r.modelAnswer !== "string" || typeof r.feedback !== "string") return null;
  return {
    momentId: r.momentId,
    status: r.status === "grader_failed" ? "grader_failed" : "graded",
    verdict: r.verdict ?? null,
    feedback: r.feedback,
    partScores: Array.isArray(r.partScores) ? r.partScores : [],
    fixNext: typeof r.fixNext === "string" ? r.fixNext : null,
    modelAnswer: r.modelAnswer,
    replayed: true,
  };
}
