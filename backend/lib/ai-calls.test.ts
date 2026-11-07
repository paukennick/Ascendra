// The ai_calls writer: error codes carry no message text, a record is built
// for success and failure, and logging can never throw into the caller.
// (The wrapper in lib/anthropic.ts is covered in anthropic.test.ts; the real
// insert in ai-calls.dbtest.ts.)
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { errorCodeOf, loggedCall, logAiCall, setAiCallSink, AiResponseError, type AiCallRecord } from "./ai-calls";

const flush = () => new Promise((r) => setImmediate(r));

describe("errorCodeOf", () => {
  test("HTTP errors: status, plus the API error type when present", () => {
    assert.equal(errorCodeOf({ status: 529 }), "http_529");
    assert.equal(errorCodeOf({ status: 400, error: { error: { type: "invalid_request_error" } } }), "http_400_invalid_request_error");
  });
  test("our own response errors and network errors use their code", () => {
    assert.equal(errorCodeOf(new AiResponseError("no_text_block", "m")), "no_text_block");
    assert.equal(errorCodeOf(Object.assign(new Error("x"), { code: "ECONNRESET" })), "ECONNRESET");
  });
  test("otherwise the error class name, never the message; junk becomes unknown_error", () => {
    assert.equal(errorCodeOf(new TypeError("includes the learner's answer")), "TypeError");
    assert.equal(errorCodeOf(undefined), "unknown_error");
    assert.equal(errorCodeOf("string"), "unknown_error");
  });
  test("is clipped to the column width", () => {
    assert.equal(errorCodeOf({ code: "x".repeat(200) }).length, 80);
  });
});

describe("loggedCall / logAiCall", () => {
  const got: AiCallRecord[] = [];
  beforeEach(() => {
    got.length = 0;
    delete process.env.AI_CALL_LOG;
    setAiCallSink(async (r) => {
      got.push(r);
    });
  });
  afterEach(() => setAiCallSink(null));

  test("success: result returned untouched, usage mapped, user id kept", async () => {
    const res = { usage: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 5, cache_creation_input_tokens: 7 } };
    const out = await loggedCall({ purpose: "pbq_grade", model: "m", userId: "u" }, async () => res);
    assert.equal(out, res);
    await flush();
    assert.equal(got.length, 1);
    assert.deepEqual(
      { ...got[0], latencyMs: 0 },
      {
        userId: "u",
        purpose: "pbq_grade",
        model: "m",
        inputTokens: 10,
        outputTokens: 20,
        cacheReadTokens: 5,
        cacheWriteTokens: 7,
        latencyMs: 0,
        ok: true,
        errorCode: null,
      }
    );
  });

  test("missing usage and missing user become nulls", async () => {
    await loggedCall({ purpose: "chat", model: "m" }, async () => "text");
    await flush();
    assert.equal(got[0].userId, null);
    assert.equal(got[0].inputTokens, null);
    assert.equal(got[0].cacheReadTokens, null);
  });

  test("failure: logged ok=false and rethrown unchanged", async () => {
    const boom = new Error("nope");
    await assert.rejects(
      loggedCall({ purpose: "chat", model: "m" }, async () => {
        throw boom;
      }),
      (e) => e === boom
    );
    await flush();
    assert.equal(got[0].ok, false);
    assert.equal(got[0].errorCode, "Error");
  });

  test("latency covers the call", async () => {
    await loggedCall({ purpose: "chat", model: "m" }, () => new Promise((r) => setTimeout(() => r({}), 30)));
    await flush();
    assert.ok(got[0].latencyMs >= 25, `latency ${got[0].latencyMs}`);
  });

  test("logAiCall never throws, for a throwing sink, a rejecting sink, or AI_CALL_LOG=off", async () => {
    const warn = console.warn;
    console.warn = () => {};
    try {
      const rec: AiCallRecord = {
        userId: null, purpose: "chat", model: "m", inputTokens: null, outputTokens: null,
        cacheReadTokens: null, cacheWriteTokens: null, latencyMs: 1, ok: true, errorCode: null,
      };
      setAiCallSink(() => {
        throw new Error("sync");
      });
      assert.doesNotThrow(() => logAiCall(rec));
      setAiCallSink(() => Promise.reject(new Error("async")));
      assert.doesNotThrow(() => logAiCall(rec));
      await flush(); // an unhandled rejection here would fail the test run
      process.env.AI_CALL_LOG = "off";
      assert.doesNotThrow(() => logAiCall(rec));
    } finally {
      console.warn = warn;
    }
  });
});
