import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  SNAPSHOT_MAX_AGE_MS,
  answerSignature,
  attemptIdFor,
  emptyCheck,
  isResumable,
  lessonFingerprint,
  newerSnapshot,
  parseSnapshot,
  snapshotStorageKey,
  FRESH_POSITION,
  anonSnapshotKeys,
  samePosition,
  settleWithin,
  shouldAdoptLateServer,
} from "./lessonProgress.ts";

const lesson = { guessPrompt: "What does an S3 bucket policy control?", teach: "Bucket policies are resource-based..." };
const key = lessonFingerprint(lesson);
const now = 1_800_000_000_000;
const rec = (over: Record<string, unknown> = {}) => ({
  v: 2, step: "fade", guess: "access", guessFeedback: "close", confidence: 3, lessonKey: key, checks: {}, savedAt: now - 1000, ...over,
});
const snap = (over: Record<string, unknown> = {}) => JSON.stringify(rec(over));

describe("lesson resume snapshot", () => {
  test("restores a fresh snapshot for the same lesson", () => {
    const s = parseSnapshot(snap(), key, now);
    assert.equal(s?.step, "fade");
    assert.equal(s?.guess, "access");
    assert.equal(s?.confidence, 3);
  });
  test("accepts the server's record (an object without a version)", () => {
    const { v, ...server } = rec();
    assert.equal(parseSnapshot(server, key, now)?.step, "fade");
  });
  test("discards a snapshot from a regenerated lesson", () => {
    const other = lessonFingerprint({ ...lesson, teach: "different text" });
    assert.notEqual(other, key);
    assert.equal(parseSnapshot(snap(), other, now), null);
  });
  test("discards stale, malformed, old-version and non-resumable snapshots", () => {
    assert.equal(parseSnapshot(snap({ savedAt: now - SNAPSHOT_MAX_AGE_MS - 1 }), key, now), null);
    assert.equal(parseSnapshot("{not json", key, now), null);
    assert.equal(parseSnapshot(null, key, now), null);
    assert.equal(parseSnapshot(snap({ step: "done" }), key, now), null);
    assert.equal(parseSnapshot(snap({ step: "guess" }), key, now), null);
    assert.equal(parseSnapshot(snap({ v: 1 }), key, now), null);
  });
  test("drops an out-of-range confidence but keeps the position", () => {
    assert.equal(parseSnapshot(snap({ confidence: 9 }), key, now)?.confidence, null);
  });
  test("keys are per user and objective; guess/done never persist", () => {
    assert.notEqual(snapshotStorageKey("u1", "a"), snapshotStorageKey("u1", "b"));
    assert.notEqual(snapshotStorageKey("u1", "a"), snapshotStorageKey("u2", "a"));
    assert.equal(isResumable("guess"), false);
    assert.equal(isResumable("done"), false);
    assert.equal(isResumable("solo"), true);
  });
  test("the newer of the device and account copies wins", () => {
    const a = parseSnapshot(snap({ step: "teach", savedAt: now - 5000 }), key, now);
    const b = parseSnapshot(snap({ step: "solo", savedAt: now - 100 }), key, now);
    assert.equal(newerSnapshot(a, b)?.step, "solo");
    assert.equal(newerSnapshot(b, a)?.step, "solo");
    assert.equal(newerSnapshot(null, a)?.step, "teach");
    assert.equal(newerSnapshot(a, null)?.step, "teach");
  });
});

describe("graded checks survive leaving the lesson", () => {
  test("a graded result is restored, so the check is not asked again", () => {
    const s = parseSnapshot(
      snap({
        checks: {
          fade: { mode: "mc", picked: 2, openAnswer: "", clientAttemptId: "id-123456", sentSignature: "mc:2",
                  result: { verdict: "correct", feedback: "That's right.", missedParts: [] } },
        },
      }),
      key,
      now
    );
    assert.equal(s?.checks.fade?.result?.verdict, "correct");
    assert.equal(s?.checks.fade?.picked, 2);
    assert.equal(s?.checks.solo, undefined);
  });

  // REQ-097: the key only ever arrives with the verdict, so it has to be saved
  // with it or a resumed check could not mark the right option.
  test("the answer key returned with a verdict is restored with it; junk is dropped", () => {
    const s = parseSnapshot(
      snap({
        checks: {
          fade: { mode: "mc", picked: 1, openAnswer: "", clientAttemptId: "id-123456", sentSignature: "mc:1",
                  result: { verdict: "incorrect", feedback: "Not quite.", missedParts: [], correctIndex: 3,
                            correctAnswer: "right", why: "because", assistReason: "repeat" } },
          solo: { mode: "open", picked: null, openAnswer: "x", clientAttemptId: null, sentSignature: null,
                  result: { verdict: "correct", feedback: "", missedParts: [], correctIndex: -1, assistReason: "nope" } },
        },
      }),
      key,
      now
    );
    const f = s?.checks.fade?.result;
    assert.deepEqual([f?.correctIndex, f?.correctAnswer, f?.why, f?.assistReason], [3, "right", "because", "repeat"]);
    assert.equal(s?.checks.solo?.result?.correctIndex, null);
    assert.equal(s?.checks.solo?.result?.assistReason, null);
  });
});

describe("Solo defaults to free response (REQ-095)", () => {
  const res = { verdict: "incorrect", feedback: "x", missedParts: [] };
  const solo = (c: Record<string, unknown>) =>
    parseSnapshot(snap({ step: "solo", checks: { solo: c } }), key, now)?.checks.solo;
  const base = { picked: null, openAnswer: "", clientAttemptId: null, sentSignature: null, result: null };

  test("a new Solo check starts in free response; Guided starts in multiple choice", () => {
    assert.equal(emptyCheck("solo").mode, "open");
    assert.equal(emptyCheck("fade").mode, "mc");
    assert.equal(emptyCheck().mode, "mc");
  });
  test("an untouched Solo check saved under the old multiple-choice default resumes in free response", () => {
    assert.equal(solo({ ...base, mode: "mc" })?.mode, "open");
    assert.equal(solo({ ...base })?.mode, "open");
  });
  test("a Solo check where choices were used keeps multiple choice on resume", () => {
    assert.equal(solo({ ...base, mode: "mc", picked: 2 })?.mode, "mc");
    assert.equal(solo({ ...base, mode: "mc", picked: 2, result: res })?.mode, "mc");
    assert.equal(solo({ ...base, mode: "open", openAnswer: "words", result: res })?.mode, "open");
  });
  test("a graded Solo result survives the round trip so the done screen can be derived from it", () => {
    assert.equal(solo({ ...base, mode: "open", openAnswer: "words", result: res })?.result?.verdict, "incorrect");
  });
  test("Guided keeps whatever it was saved with", () => {
    const f = parseSnapshot(snap({ checks: { fade: { ...base, mode: "mc" } } }), key, now)?.checks.fade;
    assert.equal(f?.mode, "mc");
  });
});

describe("attemptIdFor", () => {
  let n = 0;
  const make = () => `new-${++n}`;
  test("a fresh check gets a new id", () => {
    assert.match(attemptIdFor(emptyCheck(), "mc:1", make), /^new-/);
  });
  test("resending the same answer reuses its id (a retry, not a new attempt)", () => {
    const sent = { ...emptyCheck(), clientAttemptId: "kept-id-1", sentSignature: answerSignature("mc", 1, "") };
    assert.equal(attemptIdFor(sent, answerSignature("mc", 1, ""), make), "kept-id-1");
  });
  test("changing the answer gets a new id", () => {
    const sent = { ...emptyCheck(), clientAttemptId: "kept-id-1", sentSignature: answerSignature("mc", 1, "") };
    assert.notEqual(attemptIdFor(sent, answerSignature("mc", 2, ""), make), "kept-id-1");
    assert.notEqual(attemptIdFor(sent, answerSignature("open", null, "my words"), make), "kept-id-1");
  });
  test("free-response signatures ignore surrounding whitespace", () => {
    assert.equal(answerSignature("open", null, " a b "), answerSignature("open", null, "a b"));
  });
});

describe("REQ-101 resume on a bad connection (FAIL-091)", () => {
  test("settleWithin returns the value when it arrives in time", async () => {
    const r = await settleWithin(Promise.resolve(7), 50);
    assert.deepEqual(r, { settled: true, value: 7 });
  });
  test("settleWithin gives up after the wait and hands back the still-running read", async () => {
    let finish!: (v: number) => void;
    const slow = new Promise<number>((r) => (finish = r));
    const r = await settleWithin(slow, 10);
    assert.equal(r.settled, false);
    finish(9);
    if (!r.settled) assert.equal(await r.later, 9);
  });
  test("a late account copy is adopted only if newer and the learner hasn't moved", () => {
    const local = parseSnapshot(snap({ savedAt: now - 5000 }), key, now);
    const newer = parseSnapshot(rec({ step: "solo", savedAt: now - 1000, v: undefined }), key, now);
    const older = parseSnapshot(rec({ step: "solo", savedAt: now - 9000, v: undefined }), key, now);
    assert.equal(shouldAdoptLateServer(newer, local, false), true);
    assert.equal(shouldAdoptLateServer(newer, null, false), true, "nothing restored yet: any valid copy");
    assert.equal(shouldAdoptLateServer(newer, local, true), false, "learner already moved");
    assert.equal(shouldAdoptLateServer(older, local, false), false);
    assert.equal(shouldAdoptLateServer(null, local, false), false);
  });
  test("samePosition ignores object identity but not content", () => {
    const a = { step: "solo", guess: "g", confidence: 2, checks: { solo: emptyCheck("solo") } };
    assert.equal(samePosition(a, { ...a, checks: { solo: emptyCheck("solo") } }), true);
    assert.equal(samePosition(a, { ...a, guess: "h" }), false);
    assert.equal(samePosition(a, { ...a, checks: { solo: { ...emptyCheck("solo"), openAnswer: "x" } } }), false);
    assert.equal(samePosition(FRESH_POSITION, { step: "guess", guess: "", confidence: null, checks: {} }), true);
  });
});

describe("REQ-101 no anonymous saves (FAIL-093)", () => {
  test("only the old anon device copies are picked for removal", () => {
    assert.deepEqual(
      anonSnapshotKeys([
        "ascendra.lessonProgress.anon.o1",
        snapshotStorageKey("u1", "o1"),
        "ascendra.lessonProgress.anonymous-user.o2",
        "other.anon.key",
        "ascendra.lessonProgress.anon.o2",
      ]),
      ["ascendra.lessonProgress.anon.o1", "ascendra.lessonProgress.anon.o2"]
    );
  });
});

describe("REQ-101 restore runs once per lesson content (FAIL-094)", () => {
  test("the fingerprint is unchanged when practice content fills in, changed by a regenerate", () => {
    const withPractice = { ...lesson, fadeProblem: "f", fadeChoices: ["a", "b"], soloCheck: "s" };
    assert.equal(lessonFingerprint(withPractice), key);
    assert.notEqual(lessonFingerprint({ ...lesson, teach: "regenerated" }), key);
  });
});
