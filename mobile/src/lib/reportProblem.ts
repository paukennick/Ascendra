// REQ-114 (Audit 3 H2): "Report a problem with this question" -- the pure
// part of src/components/ReportProblem.tsx, so it can be unit-tested without
// React Native. The app says which question it means the way it already
// addresses it; the server resolves the item from rows the learner owns.

export type ReportTarget =
  // REQ-262: `lessonVariant: "new"` when the question is a beginner version's
  // Guided item (absent = the standard lesson).
  | { kind: "lesson"; objectiveId: string; stage: "fade" | "solo"; lessonVariant?: "new" }
  | { kind: "review"; sessionId: string; position: number }
  | { kind: "exam"; sessionId: string; position: number }
  | { kind: "quiz"; turnId: string }
  | { kind: "comparison"; itemId: string }
  // REQ-123: a verifiable lab, by its id.
  | { kind: "lab"; labId: string }
  // REQ-199: a simulation, through the learner's run. The tick and state
  // hash are the moment the learner saw, for the reviewer; the server
  // resolves the sim version from the run and keeps its own tick and hash.
  | { kind: "sim"; runId: string; tick?: number; stateHash?: string };

export type ReportReason = "wrong_answer" | "unclear" | "outdated" | "offensive" | "other";

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "wrong_answer", label: "The marked answer looks wrong" },
  { value: "unclear", label: "The question is unclear or has two right answers" },
  { value: "outdated", label: "It's out of date for my exam" },
  { value: "offensive", label: "It's offensive or not inclusive" },
  { value: "other", label: "Something else" },
];

// REQ-199: the same five reasons (the server's FLAG_REASONS), worded for a
// scenario rather than a question.
export const SIM_REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "wrong_answer", label: "The scoring or feedback looks wrong" },
  { value: "unclear", label: "Something in the scenario is unclear or doesn't add up" },
  { value: "outdated", label: "It's out of date for my exam or current practice" },
  { value: "offensive", label: "It's offensive or not inclusive" },
  { value: "other", label: "Something else" },
];

export function reportReasons(target: ReportTarget): { value: ReportReason; label: string }[] {
  return target.kind === "sim" ? SIM_REPORT_REASONS : REPORT_REASONS;
}

// The link, the form's heading and the note's hint for a target.
export function reportCopy(target: ReportTarget): { link: string; heading: string; placeholder: string; thanks: string } {
  if (target.kind === "sim") {
    return {
      link: "Report a problem",
      heading: "What's wrong with this simulation?",
      placeholder: "For example, what happened and what you expected",
      thanks: SIM_REPORT_SENT_FALLBACK,
    };
  }
  return {
    link: "Report a problem with this question",
    heading: "What's wrong with this question?",
    placeholder: "For example, what you think the right answer is",
    thanks: REPORT_SENT_FALLBACK,
  };
}

export const REPORT_NOTE_MAX = 500;

export function reportBody(target: ReportTarget, reason: ReportReason, note: string): Record<string, unknown> {
  const trimmed = note.trim().slice(0, REPORT_NOTE_MAX);
  const t: Record<string, unknown> = { ...target };
  for (const k of Object.keys(t)) if (t[k] === undefined) delete t[k];
  return { ...t, reason, ...(trimmed ? { note: trimmed } : {}) };
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
    case "lab":
      return `lab:${target.labId}`;
    case "sim":
      // One report per run: the tick moves while the form is open.
      return `sim:${target.runId}`;
  }
}

export const REPORT_SENT_FALLBACK = "Thanks -- we'll check this question. If it's wrong, it won't count against you.";
export const SIM_REPORT_SENT_FALLBACK = "Thanks -- we'll check this simulation. If it's wrong, it won't count against you.";
