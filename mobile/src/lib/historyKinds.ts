// REQ-206: the answer-history filter chips showed the stored ids ("unitcheck",
// "labtask"), and each row printed them too.
export const HISTORY_KINDS = ["all", "lesson", "review", "pbq", "unitcheck", "quiz", "lab", "labtask"] as const;
export type HistoryKind = (typeof HISTORY_KINDS)[number];

const LABELS: Record<string, string> = {
  all: "All",
  lesson: "Lessons",
  review: "Review",
  pbq: "PBQ",
  unitcheck: "Unit checks",
  quiz: "Quizzes",
  lab: "Labs",
  labtask: "Lab tasks",
};

// A kind the app doesn't know yet is shown capitalised, never as an id with
// underscores.
export function historyKindLabel(kind: string): string {
  const known = LABELS[kind];
  if (known) return known;
  const words = kind.replace(/[_-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Other";
}
