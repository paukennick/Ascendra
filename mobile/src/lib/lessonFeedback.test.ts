import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  assistNote,
  choiceMarks,
  describeMark,
  gradeSubmitError,
  isMiss,
  offerRereadAfterCheck,
  offerTryAgain,
  soloOutcome,
  TRY_AGAIN_NOTE,
} from "./lessonFeedback.ts";

const graded = (verdict: string) => ({ result: { verdict, feedback: "", missedParts: [] as string[] } });

describe("soloOutcome (REQ-095: done screen never says complete after a miss)", () => {
  test("only a correct Solo result completes the objective", () => {
    assert.equal(soloOutcome(graded("correct")), "complete");
  });
  test("incorrect and partial are not yet", () => {
    assert.equal(soloOutcome(graded("incorrect")), "not-yet");
    assert.equal(soloOutcome(graded("partial")), "not-yet");
  });
  test("a missing result or unknown verdict is not yet, not complete", () => {
    assert.equal(soloOutcome({ result: null }), "not-yet");
    assert.equal(soloOutcome(undefined), "not-yet");
    assert.equal(soloOutcome(null), "not-yet");
    assert.equal(soloOutcome(graded("ungraded")), "not-yet");
    assert.equal(soloOutcome(graded("")), "not-yet");
  });
});

describe("isMiss / offerRereadAfterCheck", () => {
  test("incorrect and partial are misses; correct and unknown are not", () => {
    assert.equal(isMiss("incorrect"), true);
    assert.equal(isMiss("partial"), true);
    assert.equal(isMiss("correct"), false);
    assert.equal(isMiss("ungraded"), false);
    assert.equal(isMiss(undefined), false);
  });
  test("the re-read offer is for a missed Guided item only", () => {
    assert.equal(offerRereadAfterCheck("fade", "incorrect"), true);
    assert.equal(offerRereadAfterCheck("fade", "partial"), true);
    assert.equal(offerRereadAfterCheck("fade", "correct"), false);
    assert.equal(offerRereadAfterCheck("solo", "incorrect"), false);
  });
});

describe("choiceMarks", () => {
  test("a wrong pick is marked incorrect and the right option is revealed", () => {
    assert.deepEqual(choiceMarks(4, 1, 3, "incorrect"), ["none", "picked-incorrect", "none", "correct-answer"]);
  });
  test("a right pick is marked correct and nothing else is marked", () => {
    assert.deepEqual(choiceMarks(4, 2, 2, "correct"), ["none", "none", "picked-correct", "none"]);
  });
  test("partial counts as not right", () => {
    assert.deepEqual(choiceMarks(3, 0, 2, "partial"), ["picked-incorrect", "none", "correct-answer"]);
  });
  test("the server verdict wins when the stored key disagrees: never two 'correct' options", () => {
    // verdict says right, stored key points elsewhere
    assert.deepEqual(choiceMarks(3, 0, 2, "correct"), ["picked-correct", "none", "none"]);
    // verdict says wrong, stored key points at the pick itself: no right answer can be claimed
    assert.deepEqual(choiceMarks(3, 1, 1, "incorrect"), ["none", "picked-incorrect", "none"]);
  });
  test("out-of-range, fractional or missing indexes mark nothing they cannot stand behind", () => {
    assert.deepEqual(choiceMarks(3, 1, 9, "incorrect"), ["none", "picked-incorrect", "none"]);
    assert.deepEqual(choiceMarks(3, 1, -1, "incorrect"), ["none", "picked-incorrect", "none"]);
    assert.deepEqual(choiceMarks(3, 1, 1.5, "incorrect"), ["none", "picked-incorrect", "none"]);
    assert.deepEqual(choiceMarks(3, null, 2, "incorrect"), ["none", "none", "correct-answer"]);
    assert.deepEqual(choiceMarks(3, 7, 2, "incorrect"), ["none", "none", "correct-answer"]);
    assert.deepEqual(choiceMarks(3, 0, null, "incorrect"), ["picked-incorrect", "none", "none"]);
    assert.deepEqual(choiceMarks(0, 0, 0, "incorrect"), []);
  });
});

describe("describeMark", () => {
  test("every mark has visible text and a screen-reader label, not colour alone", () => {
    assert.deepEqual(describeMark("picked-incorrect"), { tag: "Your answer - incorrect", a11y: "Your answer, incorrect", tone: "bad" });
    assert.deepEqual(describeMark("picked-correct"), { tag: "Your answer - correct", a11y: "Your answer, correct", tone: "good" });
    assert.deepEqual(describeMark("correct-answer"), { tag: "Correct answer", a11y: "Correct answer", tone: "good" });
    assert.equal(describeMark("none"), null);
  });
});

describe("assistNote / gradeSubmitError (REQ-097)", () => {
  test("an assisted answer says why it can't raise mastery; an unassisted one says nothing", () => {
    assert.match(assistNote("repeat") ?? "", /answered this question before/);
    assert.match(assistNote("hint") ?? "", /Guided at most/);
    assert.equal(assistNote(null), null);
    assert.equal(assistNote("other"), null);
  });
  test("a failed submit never reads as a grade: no connection asks for a retry, a server error shows its message", () => {
    const offline = gradeSubmitError(new TypeError("Network request failed"));
    assert.match(offline, /hasn't been graded/);
    assert.match(offline, /Retry/);
    assert.doesNotMatch(offline, /correct|incorrect/i);
    assert.equal(gradeSubmitError({ status: 429, message: "Too many requests" }), "Too many requests");
    assert.match(gradeSubmitError(null), /Retry/);
  });
});

describe("offerTryAgain (REQ-101, FAIL-095)", () => {
  test("a missed Solo check offers a fresh try; Guided and correct answers don't", () => {
    assert.equal(offerTryAgain("solo", "incorrect"), true);
    assert.equal(offerTryAgain("solo", "partial"), true);
    assert.equal(offerTryAgain("solo", "correct"), false);
    assert.equal(offerTryAgain("solo", "weird"), false);
    assert.equal(offerTryAgain("fade", "incorrect"), false);
  });
  test("the copy says a repeat won't raise mastery", () => {
    assert.match(TRY_AGAIN_NOTE, /won't raise your level/);
  });
});
