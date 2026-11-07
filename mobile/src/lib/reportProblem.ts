// REQ-114 (Audit 3 H2): "Report a problem with this question" -- the pure
// part of src/components/ReportProblem.tsx, so it can be unit-tested without
// React Native. The app says which question it means the way it already
// addresses it; the server resolves the item from rows the learner owns.

export type ReportTarget =
  | { kind: "lesson"; objectiveId: string; stage: "fade" | "solo" }
  | { kind: "review"; sessionId: string; position: number }
  | { kind: "exam"; sessionId: string; position: number }
  | { kind: "quiz"; turnId: string }
  | { kind: "comparison"; itemId: string };

export type ReportReason = "wrong_answer" | "unclear" | "outdated" | "offensive" | "other";

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "wrong_answer", label: "The marked answer looks wrong" },
  { value: "unclear", label: "The question is unclear or has two right answers" },
  { value: "outdated", label: "It's out of date for my exam" },
  { value: "offensive", label: "It's offensive or not inclusive" },
  { value: "other", label: "Something else" },
];

export const REPORT_NOTE_MAX = 500;

export function reportBody(target: ReportTarget, reason: ReportReason, note: string): Record<string, unknown> {
  const trimmed = note.trim().slice(0, REPORT_NOTE_MAX);
  return { ...target, reason, ...(trimmed ? { note: trimmed } : {}) };
}

// A stable key for "already reported in this session", so the control shows
// the thank-you line again if the screen re-renders the same question.
export function reportKey(target: ReportTarget): string {
  switch (target.kind) {
    case "lesson":
      return `lesson:${target.objectiveId}:${target.stage}`;
    case "review":
    case "exam":
      return `${target.kind}:${target.sessionId}:${target.position}`;
    case "quiz":
      return `quiz:${target.turnId}`;
    case "comparison":
      return `comparison:${target.itemId}`;
  }
}

export const REPORT_SENT_FALLBACK = "Thanks -- we'll check this question. If it's wrong, it won't count against you.";
