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

export type ChoiceMark = "none" | "picked-correct" | "picked-incorrect" | "correct-answer";

function validIndex(i: number | null | undefined, count: number): i is number {
  return typeof i === "number" && Number.isInteger(i) && i >= 0 && i < count;
}

// How each option should be marked after grading. The server's verdict is the
// authority on whether the learner's pick was right (it grades against its own
// answer key); the lesson's stored correctIndex is only used to point at the
// right option when it agrees with that verdict. If they disagree (a stale
// copy of the lesson, say) the screen says nothing it can't stand behind:
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
