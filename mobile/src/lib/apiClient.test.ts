import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";

// client.ts reads React Native's __DEV__ global when it loads.
(globalThis as Record<string, unknown>).__DEV__ = false;
const { api, ApiError, RequestTimeoutError, requestTimeoutMs, DEFAULT_TIMEOUT_MS, MODEL_TIMEOUT_MS } = await import(
  "../api/client.ts"
);

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

// A fetch that never answers on its own; it only rejects when aborted, the
// way a real fetch does on a hung connection.
function hangingFetch(): typeof fetch {
  return ((_url: string, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        const e = new Error("Aborted");
        e.name = "AbortError";
        reject(e);
      });
    })) as unknown as typeof fetch;
}

describe("request timeout (FAIL-061)", () => {
  test("a hung request ends with RequestTimeoutError instead of waiting forever", async () => {
    globalThis.fetch = hangingFetch();
    const started = Date.now();
    await assert.rejects(api.get("/api/tracks", { timeoutMs: 30 }), (err: unknown) => {
      assert.ok(err instanceof RequestTimeoutError);
      assert.ok(!(err instanceof ApiError), "a timeout is not an HTTP error, so no 401/404 handling fires");
      assert.match((err as Error).message, /took too long/);
      return true;
    });
    assert.ok(Date.now() - started < 1000);
  });

  test("a stalled response body also times out", async () => {
    globalThis.fetch = ((_url: string, init?: RequestInit) =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () =>
          new Promise((_r, reject) =>
            init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("x"), { name: "AbortError" })))
          ),
      })) as unknown as typeof fetch;
    await assert.rejects(api.get("/api/tracks", { timeoutMs: 30 }), RequestTimeoutError);
  });

  test("a fast response is unaffected and the timer does not fire later", async () => {
    let signal: AbortSignal | undefined;
    globalThis.fetch = ((_url: string, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{"a":1}') });
    }) as unknown as typeof fetch;
    assert.deepEqual(await api.get("/api/tracks", { timeoutMs: 20 }), { a: 1 });
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(signal?.aborted, false);
  });

  test("a network error that is not a timeout is passed through unchanged", async () => {
    globalThis.fetch = (() => Promise.reject(new TypeError("Network request failed"))) as unknown as typeof fetch;
    await assert.rejects(api.get("/api/tracks"), (err: unknown) => err instanceof TypeError);
  });

  test("defaults: 15 s for ordinary routes, longer for routes that wait on the model", () => {
    assert.equal(DEFAULT_TIMEOUT_MS, 15_000);
    assert.equal(requestTimeoutMs("/api/tracks"), DEFAULT_TIMEOUT_MS);
    assert.equal(requestTimeoutMs("/api/auth/refresh"), DEFAULT_TIMEOUT_MS);
    assert.equal(requestTimeoutMs("/api/chat?trackId=a"), MODEL_TIMEOUT_MS);
    assert.equal(requestTimeoutMs("/api/chat"), MODEL_TIMEOUT_MS);
    assert.equal(requestTimeoutMs("/api/pbq?unitId=u&fresh=1"), MODEL_TIMEOUT_MS);
    assert.equal(requestTimeoutMs("/api/grade"), MODEL_TIMEOUT_MS);
    assert.equal(requestTimeoutMs("/api/objectives/o1/lesson"), MODEL_TIMEOUT_MS);
    assert.equal(requestTimeoutMs("/api/objectives/o1/lesson/prefetch-next"), MODEL_TIMEOUT_MS);
    assert.equal(requestTimeoutMs("/api/objectives/o1/guess-feedback"), MODEL_TIMEOUT_MS);
    // Lookalikes are not widened.
    assert.equal(requestTimeoutMs("/api/chatter"), DEFAULT_TIMEOUT_MS);
    assert.equal(requestTimeoutMs("/api/objectives/o1/lessons-index"), DEFAULT_TIMEOUT_MS);
  });

  // FAIL-234: model-backed routes the feature branches added.
  test("routes added by exam, labs, explain-back, review, unit checks and Quiz me wait for the model", () => {
    for (const p of [
      "/api/exam/sessions",
      "/api/objectives/o1/lab/questions",
      "/api/objectives/o1/lab/report",
      "/api/objectives/o1/explain-back",
      "/api/review/sessions",
      "/api/review/sessions/s1/items/0/answer",
      "/api/units/u1/check",
      "/api/coach/quiz",
    ]) {
      assert.equal(requestTimeoutMs(p), MODEL_TIMEOUT_MS, p);
    }
    // Reads that never call the model keep the short default.
    for (const p of ["/api/exam/sessions/s1", "/api/review/today", "/api/objectives/o1/lab", "/api/review/coverage"]) {
      assert.equal(requestTimeoutMs(p), DEFAULT_TIMEOUT_MS, p);
    }
  });

  test("a per-call override wins; nonsense overrides fall back to the default", () => {
    assert.equal(requestTimeoutMs("/api/tracks", 60_000), 60_000);
    assert.equal(requestTimeoutMs("/api/chat", 5_000), 5_000);
    assert.equal(requestTimeoutMs("/api/tracks", 0), DEFAULT_TIMEOUT_MS);
    assert.equal(requestTimeoutMs("/api/tracks", -1), DEFAULT_TIMEOUT_MS);
    assert.equal(requestTimeoutMs("/api/tracks", Number.NaN), DEFAULT_TIMEOUT_MS);
  });
});
