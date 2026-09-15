// Mastery / progression rules, ported from mscs-coach.html and security-plus-coach.html.

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
  4: "Can handle transfer/PBQ-style scenarios and defend edge cases",
};

export interface Accuracy {
  attempts: number;
  correctRate: number;
}

// A topic starts as multiple-choice and only graduates to free-response once the
// learner has shown real proficiency — never on a single lucky answer.
export function isProficient(acc: Accuracy): boolean {
  return acc.attempts >= 2 && acc.correctRate >= 0.85;
}

export function accuracyFromAttempts(
  attempts: Array<{ verdict: string | null }>
): Accuracy {
  const graded = attempts.filter((a) => a.verdict);
  if (!graded.length) return { attempts: 0, correctRate: 0 };
  const correct = graded.filter((a) => a.verdict === "correct").length;
  return { attempts: graded.length, correctRate: correct / graded.length };
}

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

// Suggests a mastery status from an accuracy snapshot + confidence, mirroring the
// artifact apps' "MC-until-proficient" and "recognition never earns Independent" rules.
export function suggestStatus(params: {
  acc: Accuracy;
  lastFormat: "mc" | "open" | "pbq";
  lastVerdict: "correct" | "partial" | "incorrect";
}): MasteryStatus {
  const { acc, lastFormat, lastVerdict } = params;
  if (lastVerdict === "incorrect" && acc.attempts >= 2 && acc.correctRate < 0.5) {
    return "Needs review";
  }
  if (acc.attempts === 0) return "Not started";
  if (lastFormat === "mc") {
    return lastVerdict === "correct" ? "Guided" : "Introduced";
  }
  // free-response / pbq
  if (lastVerdict === "correct" && isProficient(acc)) return "Transfer-ready";
  if (lastVerdict === "correct") return "Independent";
  if (lastVerdict === "partial") return "Guided";
  return "Introduced";
}

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
