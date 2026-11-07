// REQ-113 (Audit 3 mobile H2, L4): the unit check's per-part rows.
//
// The screen used to find missed parts by exact text match between the
// grader's missedParts and the check's sub_parts, and showed every other part
// as a green "covered" tick. Any rewording ("Part 2: ...", a trailing period)
// broke the match, so a part the learner missed showed -- and was spoken to
// TalkBack -- as covered next to a "partial" or "incorrect" verdict. Unit
// checks are now graded per part on the server (pbqGradeResultSchema +
// normalizePartScores, backend/lib/unit-check.ts); the rows come from those
// scores. Without them (a replay from an older server, or a grader list that
// couldn't be lined up) a part is "not scored" rather than guessed as
// covered. A part the grader named as missed in exactly the stored words is
// still shown as one to work on: that match can only ever be right.
//
// Wording follows the PBQ screen: a miss is "To work on" in amber, not a red X.

import type { GradeResult, PartScore } from "@/types";

export type UnitPartState = "pending" | "met" | "partial" | "missed" | "unscored";

export interface UnitPartRow {
  part: string;
  state: UnitPartState;
  comment: string;
}

const norm = (s: string) => s.trim().toLowerCase();

export function unitCheckPartRows(subParts: string[], result: Pick<GradeResult, "missedParts" | "partScores"> | null): UnitPartRow[] {
  if (!result) return subParts.map((part) => ({ part, state: "pending", comment: "" }));
  const scores = result.partScores;
  if (Array.isArray(scores) && scores.length === subParts.length && scores.every(validScore)) {
    return subParts.map((part, i) => ({ part, state: scores[i].score, comment: scores[i].comment ?? "" }));
  }
  const missed = new Set((result.missedParts ?? []).map(norm));
  return subParts.map((part) => ({ part, state: missed.has(norm(part)) ? "missed" : "unscored", comment: "" }));
}

function validScore(p: PartScore | null | undefined): p is PartScore {
  return !!p && (p.score === "met" || p.score === "partial" || p.score === "missed");
}

export const UNIT_PART_LABEL: Record<UnitPartState, string> = {
  pending: "",
  met: "Covered",
  partial: "Partly covered",
  missed: "To work on",
  unscored: "Not scored separately",
};

// What a screen reader says for one row.
export function unitPartA11yLabel(row: UnitPartRow, index: number): string {
  const status = UNIT_PART_LABEL[row.state];
  return `Part ${index + 1}: ${row.part}${status ? `. ${status}` : ""}${row.comment ? `. ${row.comment}` : ""}`;
}

// "2 of 3 parts covered" once graded with per-part scores; null otherwise.
export function unitPartSummary(rows: UnitPartRow[]): string | null {
  if (!rows.length || rows.some((r) => r.state === "pending" || r.state === "unscored")) return null;
  const met = rows.filter((r) => r.state === "met").length;
  const partial = rows.filter((r) => r.state === "partial").length;
  return `${met} of ${rows.length} part${rows.length === 1 ? "" : "s"} covered${partial ? `, ${partial} partly` : ""}`;
}
