// REQ-095: pure decisions behind the lesson screen's honesty fixes, kept out
// of the component so they can be tested without a device.
//
//  - whether the finished lesson reads as "Objective complete" or "Not yet"
//  - which answer option is marked how once a multiple-choice check is graded
//  - whether a graded Guided answer was a miss worth offering a re-read for

import type { CheckState } from "./lessonProgress";

// Only a correct Solo answer completes the objective. A missing result is
// treated as "not yet" too: claiming completion needs evidence, and the done
// screen is only reachable after a graded answer anyway.
export type LessonOutcome = "complete" | "not-yet";

export function soloOutcome(solo: Pick<CheckState, "result"> | null | undefined): LessonOutcome {
  return solo?.result?.verdict === "correct" ? "complete" : "not-yet";
}

// An incorrect or partial answer. Unknown verdict strings are not treated as a
// miss, so a verdict the app doesn't know never triggers miss-only UI.
export function isMiss(verdict: string | null | undefined): boolean {
  return verdict === "incorrect" || verdict === "partial";
}

// A missed Guided (fade) item offers a way back to the explanation. Solo gets
// the fuller "Not yet" screen instead.
export function offerRereadAfterCheck(kind: "fade" | "solo", verdict: string | null | undefined): boolean {
  return kind === "fade" && isMiss(verdict);
}

// REQ-101 (FAIL-095): after a missed Solo check, "Re-read" led back to the
// graded answer with only "Continue". A fresh try at the same question is
// offered instead. On the server a repeat answer to a question already
// answered counts as assisted (REQ-097), so the copy says it won't raise
// mastery rather than implying it counts.
export function offerTryAgain(kind: "fade" | "solo", verdict: string | null | undefined): boolean {
  return kind === "solo" && isMiss(verdict);
}

export const TRY_AGAIN_NOTE = "Practice again — this one won't raise your level; a new question will.";

export type ChoiceMark = "none" | "picked-correct" | "picked-incorrect" | "correct-answer";

function validIndex(i: number | null | undefined, count: number): i is number {
  return typeof i === "number" && Number.isInteger(i) && i >= 0 && i < count;
}

// How each option should be marked after grading. The server's verdict is the
// authority on whether the learner's pick was right (it grades against its own
// answer key); the correctIndex it returned with the verdict (REQ-097: the
// lesson payload carries none) is only used to point at the right option when
// it agrees with that verdict. If they disagree the screen says nothing it
// can't stand behind:
// no second option is called "correct".
export function choiceMarks(
  count: number,
  picked: number | null | undefined,
  correctIndex: number | null | undefined,
  verdict: string
): ChoiceMark[] {
  const marks: ChoiceMark[] = Array.from({ length: Math.max(0, count) }, () => "none");
  const pickedOk = validIndex(picked, count);
  const pickedWasCorrect = verdict === "correct";
  if (pickedOk) marks[picked] = pickedWasCorrect ? "picked-correct" : "picked-incorrect";
  if (!pickedWasCorrect && validIndex(correctIndex, count) && !(pickedOk && picked === correctIndex)) {
    marks[correctIndex] = "correct-answer";
  }
  return marks;
}

// REQ-097: why a graded answer could not raise mastery, if it couldn't.
export function assistNote(assistReason: string | null | undefined): string | null {
  // REQ-105: a revision is assisted by design -- the feedback was on screen.
  if (assistReason === "retry") return REVISED_NOTE;
  if (assistReason === "repeat") {
    return "You've answered this question before, so this answer can't raise your mastery level. \"Try a different question\" gives you a fresh one.";
  }
  if (assistReason === "hint") {
    return "The choices were shown for this question, so this answer counts toward Guided at most.";
  }
  return null;
}

// REQ-097: grading happens only on the server, so a failed submit never shows
// a verdict. A server answer (it has a status) shows its own message; anything
// else is treated as no connection, and the answer is kept for a retry, which
// reuses the same attempt id.
export function gradeSubmitError(err: unknown): string {
  const e = err as { status?: unknown; message?: unknown } | null;
  if (e && typeof e.status === "number" && typeof e.message === "string" && e.message) return e.message;
  return "Couldn't reach the server, so this answer hasn't been graded yet. Your answer is kept -- tap Retry.";
}

// REQ-105: a missed pick is marked in the calm "warn" tone, not red -- a
// wrong option is information about what to look at next, not an alarm.
// "bad" stays in the type for any caller that still wants it.
export type MarkTone = "good" | "warn" | "bad" | "neutral";

export interface MarkDescriptor {
  // Visible text beside the option, so the mark is not colour-only.
  tag: string;
  // Prefix for the screen-reader label; the option text follows it.
  a11y: string;
  tone: MarkTone;
}

export function describeMark(mark: ChoiceMark): MarkDescriptor | null {
  switch (mark) {
    case "picked-correct":
      return { tag: "Your answer - correct", a11y: "Your answer, correct", tone: "good" };
    case "picked-incorrect":
      return { tag: "Your answer - not this one", a11y: "Your answer, not correct", tone: "warn" };
    case "correct-answer":
      return { tag: "Correct answer", a11y: "Correct answer", tone: "good" };
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// REQ-105: explain every option, show a model answer, then revise once.

// Same promise as TRY_AGAIN_NOTE: practice with the answer in view is
// assisted, so it can't raise the level; a fresh question can.
export const REVISE_NOTE = "Revise with the feedback in view. This practice won't raise your level; a new question will.";
export const REVISED_NOTE =
  "You revised with the feedback in view, so this practice won't raise your level; a new question will.";

// Shown once under a missed verdict: a miss is information, not a judgment.
export const MISS_FRAMING = "Not yet -- and that's useful: the notes below show exactly what to adjust.";

export interface ReasonRow {
  index: number; // position in the shown order
  mark: ChoiceMark;
  reason: string;
}

// The per-option reasons in reading order: the learner's pick first, then the
// correct option, then the rest as shown. null when the server sent no usable
// list (a lesson cached before option reasons existed) -- the screen then
// shows the single `why`, as before.
export function reasonRows(
  reasons: string[] | null | undefined,
  count: number,
  picked: number | null | undefined,
  correctIndex: number | null | undefined,
  verdict: string
): ReasonRow[] | null {
  if (!Array.isArray(reasons) || reasons.length !== count || count === 0) return null;
  if (!reasons.every((r) => typeof r === "string" && r.trim())) return null;
  const marks = choiceMarks(count, picked, correctIndex, verdict);
  const first: number[] = [];
  if (validIndex(picked, count)) first.push(picked);
  if (validIndex(correctIndex, count) && !first.includes(correctIndex) && marks[correctIndex] !== "none") {
    first.push(correctIndex);
  }
  const rest = Array.from({ length: count }, (_, i) => i).filter((i) => !first.includes(i));
  return [...first, ...rest].map((i) => ({ index: i, mark: marks[i], reason: reasons[i] }));
}

// Option letters for the reasons list, so each reason can be matched to its
// option without relying on position or colour.
export function optionLetter(i: number): string {
  return String.fromCharCode(65 + i);
}

interface RevisableResult {
  verdict: string;
  attemptId?: string | null;
  assistReason?: string | null;
}

// A missed free-response answer can be revised once, with its feedback in
// view. Not a multiple-choice miss (the key is already on screen), not a
// revision of a revision, and not without the attempt id the server needs.
export function offerRevision(
  mode: "mc" | "open",
  result: RevisableResult | null | undefined,
  firstResult: unknown
): boolean {
  return (
    mode === "open" &&
    !!result &&
    isMiss(result.verdict) &&
    !firstResult &&
    result.assistReason !== "retry" &&
    typeof result.attemptId === "string" &&
    result.attemptId.length > 0
  );
}

// PBQ: same rule (the PBQ screen has no multiple choice).
export function offerPbqRevision(result: RevisableResult | null | undefined, firstResult: unknown): boolean {
  return offerRevision("open", result, firstResult);
}

// The check state for starting a revision: the missed result moves to
// firstResult (kept on screen), the answer stays in the box to edit, and the
// next submit is a new attempt (fresh client id).
export function startRevision<S extends { result: R | null; clientAttemptId: string | null; sentSignature: string | null; firstResult?: R | null }, R>(
  state: S
): S {
  return { ...state, firstResult: state.result, result: null, clientAttemptId: null, sentSignature: null };
}
