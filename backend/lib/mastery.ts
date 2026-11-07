// Mastery labels, rubric and review schedule. The rule that assigns a status
// lives in SQL (see below).

export const MASTERY_LABELS = [
  "Not started",
  "Introduced",
  "Guided",
  "Independent",
  "Transfer-ready",
  "Needs review",
] as const;
export type MasteryStatus = (typeof MASTERY_LABELS)[number];

// 0-4 rubric meaning, shown alongside a numeric mastery score.
export const SCORE_MEANING: Record<number, string> = {
  0: "Not yet introduced",
  1: "Recognizes terms but shaky recall/application",
  2: "Can answer guided/MC-level questions",
  3: "Can answer free-response and scenario questions independently",
  4: "Answers independently and correctly again on a later day (spaced retrieval)",
};

// Spaced review schedule: 1 / 7 / 21 days out. review_stage 0 -> next review in 1 day,
// stage 1 -> 7 days, stage 2 -> 21 days, stage 3 -> resolved (no more scheduled review).
const REVIEW_OFFSETS_DAYS = [1, 7, 21];

export function nextReviewDate(fromDate: Date, reviewStage: number): Date | null {
  if (reviewStage >= REVIEW_OFFSETS_DAYS.length) return null;
  const d = new Date(fromDate);
  d.setDate(d.getDate() + REVIEW_OFFSETS_DAYS[reviewStage]);
  return d;
}

export function toDateOnlyString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// REQ-097: the status itself is computed in the database by
// mastery_from_attempts() (migration 029) from the learner's whole attempt
// history, so live grading and the 029 recompute share one rule. Tests:
// lib/mastery-integrity.dbtest.ts.

export function statusToScore(status: MasteryStatus): number {
  switch (status) {
    case "Not started":
      return 0;
    case "Introduced":
      return 1;
    case "Guided":
      return 2;
    case "Independent":
      return 3;
    case "Transfer-ready":
      return 4;
    case "Needs review":
      return 1;
    default:
      return 0;
  }
}
