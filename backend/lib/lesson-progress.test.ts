import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { sanitizeLessonProgress, validClientAttemptId, validClientTime } from "./lesson-progress";

const base = { step: "fade", guess: "g", guessFeedback: null, confidence: 3, lessonKey: "12:abc", checks: {} };

describe("sanitizeLessonProgress", () => {
  test("accepts a well-formed position", () => {
    const r = sanitizeLessonProgress(base);
    assert.equal(typeof r, "object");
    assert.equal((r as { step: string }).step, "fade");
  });
  test("rejects guess/done steps and a missing lesson key", () => {
    assert.equal(typeof sanitizeLessonProgress({ ...base, step: "guess" }), "string");
    assert.equal(typeof sanitizeLessonProgress({ ...base, step: "done" }), "string");
    assert.equal(typeof sanitizeLessonProgress({ ...base, lessonKey: "" }), "string");
    assert.equal(typeof sanitizeLessonProgress(null), "string");
  });
  test("drops bad confidence, unknown verdicts and out-of-range picks", () => {
    const r = sanitizeLessonProgress({
      ...base,
      confidence: 9,
      checks: {
        fade: { mode: "mc", picked: 99, result: { verdict: "maybe", feedback: "x" } },
        solo: { mode: "open", openAnswer: "a", result: { verdict: "partial", feedback: "f", missedParts: ["p", 3] } },
        extra: { mode: "mc" },
      },
    }) as ReturnType<typeof sanitizeLessonProgress> & { confidence: number | null; checks: Record<string, any> };
    assert.equal(r.confidence, null);
    assert.equal(r.checks.fade.picked, null);
    assert.equal(r.checks.fade.result, null);
    assert.deepEqual(r.checks.solo.result.missedParts, ["p"]);
    assert.equal("extra" in r.checks, false);
  });
  test("keeps the answer key that came back with a verdict (REQ-097), and drops junk", () => {
    const r = sanitizeLessonProgress({
      ...base,
      checks: {
        fade: { mode: "mc", result: { verdict: "incorrect", feedback: "f", correctIndex: 2, correctAnswer: "c", why: "w", assistReason: "repeat" } },
        solo: { mode: "open", result: { verdict: "correct", feedback: "f", correctIndex: 99, assistReason: "cheat" } },
      },
    }) as any;
    assert.deepEqual(
      [r.checks.fade.result.correctIndex, r.checks.fade.result.correctAnswer, r.checks.fade.result.why, r.checks.fade.result.assistReason],
      [2, "c", "w", "repeat"]
    );
    assert.equal(r.checks.solo.result.correctIndex, null);
    assert.equal(r.checks.solo.result.assistReason, null);
  });
  // REQ-105
  test("keeps option reasons, model answer, fix line, attempt id and the first (missed) result of a revision", () => {
    const first = { verdict: "partial", feedback: "f1", modelAnswer: "M", fixNext: "F", attemptId: "11111111-2222-3333-4444-555555555555" };
    const r = sanitizeLessonProgress({
      ...base,
      checks: {
        fade: { mode: "mc", result: { verdict: "incorrect", feedback: "f", optionReasons: ["a", "b", "c", "d"] } },
        solo: { mode: "open", firstResult: first, result: { verdict: "correct", feedback: "f2", assistReason: "retry" } },
      },
    }) as any;
    assert.deepEqual(r.checks.fade.result.optionReasons, ["a", "b", "c", "d"]);
    assert.equal(r.checks.fade.firstResult, null);
    assert.equal(r.checks.solo.firstResult.modelAnswer, "M");
    assert.equal(r.checks.solo.firstResult.fixNext, "F");
    assert.equal(r.checks.solo.firstResult.attemptId, first.attemptId);
    assert.equal(r.checks.solo.result.assistReason, "retry");
    const junk = sanitizeLessonProgress({
      ...base,
      checks: { fade: { mode: "mc", result: { verdict: "incorrect", feedback: "f", optionReasons: ["a", 2] } } },
    }) as any;
    assert.equal(junk.checks.fade.result.optionReasons, null);
  });
  test("caps stored text length", () => {
    const r = sanitizeLessonProgress({ ...base, guess: "x".repeat(20000) }) as { guess: string };
    assert.equal(r.guess.length, 8000);
  });
});

describe("validClientAttemptId", () => {
  test("accepts uuids and rejects junk", () => {
    assert.equal(validClientAttemptId("0b9e6c1a-2f4d-4c1e-9a7b-3d2e1f0a9b8c"), "0b9e6c1a-2f4d-4c1e-9a7b-3d2e1f0a9b8c");
    assert.equal(validClientAttemptId("short"), null);
    assert.equal(validClientAttemptId("'; drop table attempts; --"), null);
    assert.equal(validClientAttemptId(42), null);
  });
});

describe("validClientTime (REQ-101)", () => {
  test("accepts a millisecond timestamp, rejects anything else", () => {
    assert.equal(validClientTime(1762500000000), 1762500000000);
    assert.equal(validClientTime(1762500000000.7), 1762500000000);
    for (const v of [undefined, null, "1762500000000", 0, -5, NaN, Infinity, 1e15]) assert.equal(validClientTime(v), null);
  });
});
