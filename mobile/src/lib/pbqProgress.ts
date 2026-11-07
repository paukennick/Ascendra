// The PBQ simulator kept its scenario, the learner's answer and the graded
// result only in React state, so leaving the screen -- to the sidebar, the
// dashboard, a call -- lost all three, and coming back generated a scenario
// (possibly a different one) from scratch. This is the pure half of the fix:
// what gets saved, and the rules for whether it may be shown again. The
// screen does the reads and writes (via src/lib/useStoredDraft.ts).
//
// REQ-093: the whole scenario is stored rather than just its id, so the
// screen comes back without a round trip. (A plain GET /api/pbq returns an
// unattempted scenario -- REQ-107 -- so it would not hand this one back once
// it has been answered.)

import type { GradeResult, PartScore, PBQScenario } from "@/types";

export interface PbqSnapshot {
  unitId: string;
  scenario: PBQScenario;
  answer: string;
  result: GradeResult | null;
  // REQ-105: set while revising the missed sub-parts and after: the first,
  // missed result, whose feedback stays on screen. Optional for old drafts.
  firstResult?: GradeResult | null;
  // Sent with the graded answer so the server can tell a retry from a new
  // attempt (see POST /api/pbq). sentSignature is the answer it went with.
  clientAttemptId: string | null;
  sentSignature: string | null;
}

export const PBQ_ANSWER_MAX = 20_000;
export const PBQ_SUB_PARTS_MAX = 12;

const VERDICTS: readonly string[] = ["correct", "partial", "incorrect"];
const PART_SCORES: readonly string[] = ["met", "partial", "missed"];

// REQ-107: one row per sub-part for the graded result. The grader's own
// per-part scores when the server sent them; otherwise (a replayed retry, an
// older server, a saved result from before) each part is met or missed by
// matching missedParts, as the screen did before. Before grading every row
// is "pending".
export type PartRowState = "pending" | PartScore["score"];
export interface PartRow {
  part: string;
  state: PartRowState;
  comment: string;
}

export function pbqPartRows(subParts: string[], result: GradeResult | null): PartRow[] {
  if (!result) return subParts.map((part) => ({ part, state: "pending", comment: "" }));
  const scores = result.partScores;
  if (Array.isArray(scores) && scores.length === subParts.length) {
    return subParts.map((part, i) => ({ part, state: scores[i].score, comment: scores[i].comment ?? "" }));
  }
  const missed = new Set((result.missedParts ?? []).map((p) => p.trim().toLowerCase()));
  return subParts.map((part) => ({
    part,
    state: missed.has(part.trim().toLowerCase()) ? "missed" : "met",
    comment: "",
  }));
}

// "2 of 3 parts met" -- partial counts as half, so the summary agrees with
// the rows. null before grading.
export function pbqPartSummary(rows: PartRow[]): string | null {
  if (!rows.length || rows[0].state === "pending") return null;
  const met = rows.filter((r) => r.state === "met").length;
  const partial = rows.filter((r) => r.state === "partial").length;
  const tail = partial ? `, ${partial} partly` : "";
  return `${met} of ${rows.length} part${rows.length === 1 ? "" : "s"} met${tail}`;
}

function parsePartScores(v: unknown): PartScore[] | null {
  if (!Array.isArray(v) || v.length > PBQ_SUB_PARTS_MAX) return null;
  const out: PartScore[] = [];
  for (const p of v) {
    if (!p || typeof p !== "object") return null;
    const r = p as Record<string, unknown>;
    if (typeof r.part !== "string" || typeof r.score !== "string" || !PART_SCORES.includes(r.score)) return null;
    out.push({ part: r.part, score: r.score as PartScore["score"], comment: typeof r.comment === "string" ? r.comment : "" });
  }
  return out;
}

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

function parsePbqResult(v: unknown): GradeResult | null {
  const rr = v as Record<string, unknown> | null | undefined;
  if (!rr || typeof rr !== "object" || typeof rr.verdict !== "string" || !VERDICTS.includes(rr.verdict)) return null;
  const strings = (x: unknown) => (Array.isArray(x) ? x.filter((p): p is string => typeof p === "string") : []);
  const attempt = rr.attempt as Record<string, unknown> | null | undefined;
  const attemptId = attempt && typeof attempt === "object" ? str(attempt.id) : null;
  return {
    verdict: rr.verdict as GradeResult["verdict"],
    feedback: str(rr.feedback) ?? "",
    classification: str(rr.classification) ?? "",
    missedParts: strings(rr.missedParts),
    modelAnswer: str(rr.modelAnswer),
    fixNext: str(rr.fixNext),
    assistReason: rr.assistReason === "hint" || rr.assistReason === "repeat" || rr.assistReason === "retry" ? rr.assistReason : null,
    partScores: parsePartScores(rr.partScores),
    ...(Array.isArray(rr.revisedParts) ? { revisedParts: strings(rr.revisedParts) } : {}),
    ...(attemptId ? { attempt: { id: attemptId } } : {}),
  };
}

// What the simulator shows after asking for a scenario ("Generate" or "Try
// another scenario"). A new scenario starts blank: no answer, no result, no
// attempt id. A failed request changes nothing -- the old scenario keeps its
// answer, its graded result and its attempt id, so resending the same answer
// is still recognised as a retry (FAIL-067; it used to come back blank).
export interface PbqScreenState {
  scenario: PBQScenario | null;
  answer: string;
  result: GradeResult | null;
  sent: { id: string; signature: string } | null;
}

export function pbqAfterGenerate(prev: PbqScreenState, fetched: PBQScenario | null): PbqScreenState {
  if (!fetched) return prev;
  return { scenario: fetched, answer: "", result: null, sent: null };
}

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

  const result = parsePbqResult(r.result);
  // REQ-105: the first, missed result of a revision (kept on screen).
  const firstResult = parsePbqResult(r.firstResult);

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
    firstResult,
    clientAttemptId: typeof r.clientAttemptId === "string" ? r.clientAttemptId : null,
    sentSignature: typeof r.sentSignature === "string" ? r.sentSignature : null,
  };
}
