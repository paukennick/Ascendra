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

export type MarkTone = "good" | "bad" | "neutral";

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
      return { tag: "Your answer - incorrect", a11y: "Your answer, incorrect", tone: "bad" };
    case "correct-answer":
      return { tag: "Correct answer", a11y: "Correct answer", tone: "good" };
    default:
      return null;
  }
}
