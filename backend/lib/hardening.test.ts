// REQ-098 unit tests: health cache, text input bounds, schema probe errors,
// idempotency matching. No database.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createHealthCache } from "./health";
import { checkSchema, isConnectionError } from "./schema-status";
import { cleanText, hasUnstorableText, textField } from "./text-input";
import { normUuid } from "./visibility";
import { sameAttempt } from "./grading-service";
import { replyIdFor } from "./chat-store";
import { sanitizeLessonProgress } from "./lesson-progress";

describe("health cache", () => {
  test("50 concurrent checks run the probes once; after the TTL they run again", async () => {
    let calls = 0;
    const run = async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 5));
      return [{ ok: true }];
    };
    const cache = createHealthCache(1_000, 100);
    const results = await Promise.all(Array.from({ length: 50 }, () => cache.get(run)));
    assert.ok(results.every((r) => r.kind === "ok"));
    const perCheck = calls;
    assert.ok(perCheck > 1, "a check is select 1 plus the probes");
    await cache.get(run);
    assert.equal(calls, perCheck, "cached within the TTL");
    await cache.get(run, Date.now() + 2_000);
    assert.equal(calls, perCheck * 2, "recomputed after the TTL");
  });

  test("a failure is cached only briefly and carries the error, not a response body", async () => {
    let calls = 0;
    const cache = createHealthCache(30_000, 50);
    const failing = async () => {
      calls++;
      throw Object.assign(new Error('connect ECONNREFUSED db.secret.host'), { code: "ECONNREFUSED" });
    };
    const r1 = await cache.get(failing);
    assert.equal(r1.kind, "error");
    await cache.get(failing);
    assert.equal(calls, 1);
    await cache.get(failing, Date.now() + 1_000);
    assert.equal(calls, 2);
  });
});

describe("schema probes", () => {
  test("a connection error during probing is an outage, not a missing migration", async () => {
    await assert.rejects(
      checkSchema(async () => {
        throw Object.assign(new Error("terminating connection"), { code: "57P01" });
      })
    );
    assert.equal(isConnectionError({ code: "08006" }), true);
    assert.equal(isConnectionError({ code: "ECONNRESET" }), true);
    assert.equal(isConnectionError({ code: "42P01" }), false);
    assert.equal(isConnectionError(new Error("no code")), false);
  });
});

describe("text input", () => {
  test("NUL and lone surrogates are unstorable; a whole emoji is fine", () => {
    assert.equal(hasUnstorableText("a\u0000b"), true);
    assert.equal(hasUnstorableText("x\uD83D"), true);
    assert.equal(hasUnstorableText("\uDE00x"), true);
    assert.equal(hasUnstorableText("ok 😀"), false);
  });

  test("textField: type, required, cap boundary and bad characters", () => {
    assert.deepEqual(textField("a".repeat(10), "f", 10), { ok: true, value: "a".repeat(10) });
    assert.equal(textField("a".repeat(11), "f", 10).ok, false);
    assert.equal(textField(5, "f", 10).ok, false);
    assert.equal(textField("", "f", 10, { required: true }).ok, false);
    assert.deepEqual(textField(undefined, "f", 10), { ok: true, value: "" });
    assert.equal(textField("a\u0000", "f", 10).ok, false);
  });

  test("cleanText never splits a surrogate pair and drops NULs", () => {
    const s = "a".repeat(7) + "😀" + "z";
    assert.equal(cleanText(s, 8), "a".repeat(7));
    assert.equal(cleanText(s, 9), "a".repeat(7) + "😀");
    assert.equal(cleanText("a\u0000b", 10), "ab");
    assert.equal(cleanText("x\uDE00y", 10), "x�y");
    assert.equal(hasUnstorableText(cleanText("\uD83D".repeat(3) + "\u0000", 2)), false);
  });

  test("normUuid lowercases a uuid and rejects anything else", () => {
    assert.equal(normUuid("A1B2C3D4-0000-4000-8000-ABCDEFABCDEF"), "a1b2c3d4-0000-4000-8000-abcdefabcdef");
    assert.equal(normUuid("not-a-uuid"), null);
    assert.equal(normUuid(null), null);
  });
});

describe("idempotency matching", () => {
  const stored = {
    objective_id: "a1b2c3d4-0000-4000-8000-abcdefabcdef",
    pbq_scenario_id: null,
    kind: "lesson",
    format: "mc",
    stage: "fade",
    question: "Q",
    answer: "A",
  };
  const req = {
    objectiveId: "A1B2C3D4-0000-4000-8000-ABCDEFABCDEF",
    kind: "lesson" as const,
    format: "mc" as const,
    stage: "fade",
    question: "Q",
    answer: "A",
  };
  test("the same submission matches, whatever the id's case", () => {
    assert.equal(sameAttempt(stored, req), true);
  });
  test("any change to answer, question, objective, stage, kind or format does not", () => {
    for (const change of [
      { answer: "B" },
      { question: "Q2" },
      { objectiveId: "b1b2c3d4-0000-4000-8000-abcdefabcdef" },
      { stage: "solo" },
      { kind: "quiz" as const },
      { format: "open" as const },
    ]) {
      assert.equal(sameAttempt(stored, { ...req, ...change }), false, JSON.stringify(change));
    }
  });
  test("without a question (/api/grade since REQ-097) only objective, kind, format, stage and answer count", () => {
    const { question: _q, ...graded } = req;
    assert.equal(sameAttempt({ ...stored, question: "regenerated Q" }, graded), true);
    assert.equal(sameAttempt(stored, { ...graded, answer: "B" }), false);
    assert.equal(sameAttempt(stored, { ...graded, stage: "solo" }), false);
  });
  test("the reply id is a uuid derived from the message row id, stable and case-insensitive", () => {
    const a = replyIdFor("a1b2c3d4-0000-4000-8000-abcdefabcdef");
    assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    assert.equal(replyIdFor("A1B2C3D4-0000-4000-8000-ABCDEFABCDEF"), a);
  });
});

describe("answer signature survives the account copy", () => {
  test("a 4000-character answer and its signature round-trip unchanged (the app's input cap)", () => {
    const answer = "y".repeat(4_000);
    const sig = `open:${answer.trim()}`;
    const out = sanitizeLessonProgress({
      step: "solo",
      lessonKey: "k",
      checks: { solo: { mode: "open", openAnswer: answer, sentSignature: sig, clientAttemptId: "id-12345678", result: null } },
    });
    assert.notEqual(typeof out, "string");
    const solo = (out as Exclude<typeof out, string>).checks.solo!;
    assert.equal(solo.openAnswer, answer);
    assert.equal(solo.sentSignature, sig);
  });
});
