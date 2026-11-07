// The PBQ simulator kept its scenario, the learner's answer and the graded
// result only in React state, so leaving the screen -- to the sidebar, the
// dashboard, a call -- lost all three, and coming back generated a scenario
// (possibly a different one) from scratch. This is the pure half of the fix:
// what gets saved, and the rules for whether it may be shown again. The
// screen does the reads and writes (via src/lib/useStoredDraft.ts).
//
// REQ-093: GET /api/pbq can only return a unit's *latest* scenario, never one
// by id, so the whole scenario is stored rather than just its id -- an older
// scenario (after "Try another") can't be fetched back.

import type { GradeResult, PBQScenario } from "@/types";

export interface PbqSnapshot {
  unitId: string;
  scenario: PBQScenario;
  answer: string;
  result: GradeResult | null;
  // Sent with the graded answer so the server can tell a retry from a new
  // attempt (see POST /api/pbq). sentSignature is the answer it went with.
  clientAttemptId: string | null;
  sentSignature: string | null;
}

export const PBQ_ANSWER_MAX = 20_000;
export const PBQ_SUB_PARTS_MAX = 12;

const VERDICTS: readonly string[] = ["correct", "partial", "incorrect"];

// Serialised without a timestamp: the draft envelope (drafts.ts) adds one at
// write time, which keeps this string stable between renders.
export function pbqPayload(s: PbqSnapshot | null): string | null {
  return s ? JSON.stringify(s) : null;
}

// Returns the snapshot only if it is well-formed and belongs to the unit the
// screen is showing. Anything else returns null (start from the unit picker).
// Staleness (7 days) is enforced by decodeDraft before this is called.
export function parsePbqPayload(payload: string, currentUnitId: string): PbqSnapshot | null {
  let o: unknown;
  try {
    o = JSON.parse(payload);
  } catch {
    return null;
  }
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  if (r.unitId !== currentUnitId) return null;

  const sc = r.scenario as Record<string, unknown> | null | undefined;
  if (!sc || typeof sc !== "object") return null;
  if (typeof sc.id !== "string" || !sc.id) return null;
  if (sc.unit_id !== currentUnitId) return null;
  if (typeof sc.title !== "string" || typeof sc.scenario !== "string") return null;
  if (!Array.isArray(sc.sub_parts) || sc.sub_parts.length > PBQ_SUB_PARTS_MAX) return null;
  if (!sc.sub_parts.every((p) => typeof p === "string")) return null;

  const rr = r.result as Record<string, unknown> | null | undefined;
  const result: GradeResult | null =
    rr && typeof rr === "object" && typeof rr.verdict === "string" && VERDICTS.includes(rr.verdict)
      ? {
          verdict: rr.verdict as GradeResult["verdict"],
          feedback: typeof rr.feedback === "string" ? rr.feedback : "",
          classification: typeof rr.classification === "string" ? rr.classification : "",
          missedParts: Array.isArray(rr.missedParts)
            ? rr.missedParts.filter((p): p is string => typeof p === "string")
            : [],
        }
      : null;

  return {
    unitId: currentUnitId,
    scenario: {
      id: sc.id,
      unit_id: sc.unit_id as string,
      title: sc.title,
      scenario: sc.scenario,
      sub_parts: sc.sub_parts as string[],
      generated_at: typeof sc.generated_at === "string" ? sc.generated_at : "",
    },
    answer: typeof r.answer === "string" ? r.answer.slice(0, PBQ_ANSWER_MAX) : "",
    result,
    clientAttemptId: typeof r.clientAttemptId === "string" ? r.clientAttemptId : null,
    sentSignature: typeof r.sentSignature === "string" ? r.sentSignature : null,
  };
}
