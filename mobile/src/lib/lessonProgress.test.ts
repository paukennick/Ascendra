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
