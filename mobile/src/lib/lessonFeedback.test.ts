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
  REVISE_NOTE,
  reasonRows,
  optionLetter,
  offerRevision,
  offerPbqRevision,
  startRevision,
} from "./lessonFeedback.ts";

// REQ-105
describe("reasonRows", () => {
  const reasons = ["rA", "rB", "rC", "rD"];
  test("a miss lists the learner's pick first, then the correct option, then the rest as shown", () => {
    const rows = reasonRows(reasons, 4, 2, 0, "incorrect")!;
    assert.deepEqual(rows.map((r) => r.index), [2, 0, 1, 3]);
    assert.deepEqual(rows.map((r) => r.mark), ["picked-incorrect", "correct-answer", "none", "none"]);
    assert.deepEqual(rows.map((r) => r.reason), ["rC", "rA", "rB", "rD"]);
  });
  test("a correct pick is listed once, first", () => {
    assert.deepEqual(reasonRows(reasons, 4, 3, 3, "correct")!.map((r) => r.index), [3, 0, 1, 2]);
  });
  test("an older lesson with no (or a mismatched) list returns null, so the single explanation shows instead", () => {
    assert.equal(reasonRows(null, 4, 1, 0, "incorrect"), null);
    assert.equal(reasonRows(undefined, 4, 1, 0, "incorrect"), null);
    assert.equal(reasonRows(["a", "b"], 4, 1, 0, "incorrect"), null);
    assert.equal(reasonRows(["a", "", "c", "d"], 4, 1, 0, "incorrect"), null);
  });
  test("options are lettered so a reason can be matched without color", () => {
    assert.deepEqual([0, 1, 2, 3].map(optionLetter), ["A", "B", "C", "D"]);
  });
});

describe("offerRevision / startRevision", () => {
  const miss = { verdict: "partial", attemptId: "a-1", assistReason: null };
  test("a missed free-response answer can be revised once", () => {
    assert.equal(offerRevision("open", miss, null), true);
    assert.equal(offerRevision("open", miss, undefined), true);
    assert.equal(offerRevision("open", miss, { verdict: "incorrect" }), false, "already revised");
    assert.equal(offerRevision("open", { ...miss, assistReason: "retry" }, null), false, "a revision isn't revised");
    assert.equal(offerRevision("open", { ...miss, verdict: "correct" }, null), false);
    assert.equal(offerRevision("open", { ...miss, attemptId: null }, null), false, "no id, nothing to point at");
    assert.equal(offerRevision("mc", miss, null), false, "the key is already on screen for multiple choice");
    assert.equal(offerPbqRevision(miss, null), true);
    assert.equal(offerPbqRevision(miss, miss), false);
  });
  test("starting a revision keeps the first result and the answer, and makes the next submit a new attempt", () => {
    const s = {
      mode: "open" as const,
      picked: null,
      openAnswer: "my draft",
      clientAttemptId: "c-1",
      sentSignature: "open:my draft",
      result: { verdict: "partial", feedback: "f", missedParts: [] },
    };
    const r = startRevision(s);
    assert.equal(r.openAnswer, "my draft");
    assert.equal(r.result, null);
    assert.deepEqual(r.firstResult, s.result);
    assert.equal(r.clientAttemptId, null);
    assert.equal(r.sentSignature, null);
  });
  test("the copy says plainly it won't raise the level, like Try again", () => {
    assert.match(REVISE_NOTE, /won't raise your level; a new question will/);
    assert.match(assistNote("retry") ?? "", /won't raise your level; a new question will/);
  });
});

const graded = (verdict: string) => ({ result: { verdict, feedback: "", missedParts: [] as string[] } });

describe("soloOutcome (REQ-133: done screen never says complete after a miss)", () => {
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
  test("every mark has visible text and a screen-reader label, not color alone", () => {
    // REQ-105: a missed pick is calm ("warn"), not red, and still says plainly it wasn't right.
    assert.deepEqual(describeMark("picked-incorrect"), { tag: "Your answer - not this one", a11y: "Your answer, not correct", tone: "warn" });
    assert.deepEqual(describeMark("picked-correct"), { tag: "Your answer - correct", a11y: "Your answer, correct", tone: "good" });
    assert.deepEqual(describeMark("correct-answer"), { tag: "Correct answer", a11y: "Correct answer", tone: "good" });
    assert.equal(describeMark("none"), null);
  });
});

describe("assistNote / gradeSubmitError (REQ-134)", () => {
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
  // REQ-121: the lab report (labReport.tsx) now answers a reused id with the
  // shared 409 instead of 400; the app keys off the server's message, not the
  // status, so it still shows that message and never "no connection".
  test("a 409 replay conflict shows the server's message, not the offline retry text", () => {
    const msg = "This id was already used for a different question.";
    assert.equal(gradeSubmitError({ status: 409, message: msg }), msg);
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
