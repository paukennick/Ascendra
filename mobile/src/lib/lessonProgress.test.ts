import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  SNAPSHOT_MAX_AGE_MS,
  isResumable,
  lessonFingerprint,
  parseSnapshot,
  snapshotStorageKey,
} from "./lessonProgress.ts";

const lesson = { guessPrompt: "What does an S3 bucket policy control?", teach: "Bucket policies are resource-based..." };
const key = lessonFingerprint(lesson);
const now = 1_800_000_000_000;
const snap = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ v: 1, step: "fade", guess: "access", guessFeedback: "close", confidence: 3, lessonKey: key, savedAt: now - 1000, ...over });

describe("lesson resume snapshot", () => {
  test("restores a fresh snapshot for the same lesson", () => {
    const s = parseSnapshot(snap(), key, now);
    assert.equal(s?.step, "fade");
    assert.equal(s?.guess, "access");
    assert.equal(s?.confidence, 3);
  });
  test("discards a snapshot from a regenerated lesson", () => {
    const other = lessonFingerprint({ ...lesson, teach: "different text" });
    assert.notEqual(other, key);
    assert.equal(parseSnapshot(snap(), other, now), null);
  });
  test("discards stale, malformed, and non-resumable snapshots", () => {
    assert.equal(parseSnapshot(snap({ savedAt: now - SNAPSHOT_MAX_AGE_MS - 1 }), key, now), null);
    assert.equal(parseSnapshot("{not json", key, now), null);
    assert.equal(parseSnapshot(null, key, now), null);
    assert.equal(parseSnapshot(snap({ step: "done" }), key, now), null);
    assert.equal(parseSnapshot(snap({ step: "guess" }), key, now), null);
    assert.equal(parseSnapshot(snap({ v: 2 }), key, now), null);
  });
  test("drops an out-of-range confidence but keeps the position", () => {
    assert.equal(parseSnapshot(snap({ confidence: 9 }), key, now)?.confidence, null);
  });
  test("keys are per objective and guess/done never persist", () => {
    assert.notEqual(snapshotStorageKey("a"), snapshotStorageKey("b"));
    assert.equal(isResumable("guess"), false);
    assert.equal(isResumable("done"), false);
    assert.equal(isResumable("solo"), true);
  });
});
