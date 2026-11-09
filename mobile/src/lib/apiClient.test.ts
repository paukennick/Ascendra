import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";

// client.ts reads React Native's __DEV__ global when it loads.
(globalThis as Record<string, unknown>).__DEV__ = false;
const { api, ApiError, NetworkError, RequestTimeoutError, requestTimeoutMs, DEFAULT_TIMEOUT_MS, MODEL_TIMEOUT_MS } = await import(
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

  // REQ-113 (Audit 3 mobile M7, FAIL-262): no longer passed through raw. It
  // is still neither a timeout nor an HTTP error, and keeps the original as
  // its cause, but its message is the calm one screens show.
  test("a network error that is not a timeout is a NetworkError carrying the original", async () => {
    const original = new TypeError("Network request failed");
    globalThis.fetch = (() => Promise.reject(original)) as unknown as typeof fetch;
    await assert.rejects(api.get("/api/tracks"), (err: unknown) => {
      assert.ok(err instanceof NetworkError);
      assert.ok(!(err instanceof RequestTimeoutError));
      assert.ok(!(err instanceof ApiError));
      assert.equal((err as InstanceType<typeof NetworkError>).cause, original);
      assert.match((err as Error).message, /Couldn't reach Ascendra/);
      return true;
    });
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

// REQ-146 (FAIL-530): without this header the server treats the app as a
// build from before the Solo hint flow and puts the Solo choices in the
// lesson, recording a hint for the item. This app must always send it.
describe("client protocol header (FAIL-530)", () => {
  test("every request carries X-Ascendra-Client with the protocol number", async () => {
    const { CLIENT_PROTOCOL, CLIENT_PROTOCOL_HEADER } = await import("../api/client.ts");
    const seen: Array<Record<string, string>> = [];
    globalThis.fetch = ((_url: string, init?: RequestInit) => {
      seen.push(init?.headers as Record<string, string>);
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("{}") });
    }) as unknown as typeof fetch;
    await api.get("/api/objectives/x/lesson");
    await api.post("/api/objectives/x/hint", { stage: "solo" });
    assert.equal(CLIENT_PROTOCOL_HEADER, "X-Ascendra-Client");
    assert.ok(CLIENT_PROTOCOL >= 1);
    assert.equal(seen.length, 2);
    for (const h of seen) assert.equal(h["X-Ascendra-Client"], String(CLIENT_PROTOCOL));
  });
});

// REQ-175 (FAIL-560): without X-Ascendra-App the server treats the app as a
// build from before the header (it may accept the previous Terms). This app
// must always send it, before and after its build is known; a 426
// { code: "update_required" } reaches the "Update required" screen.
describe("app version header and update required (REQ-175)", () => {
  test("every request carries X-Ascendra-App, and the platform once the build is known", async () => {
    const { setAppIdentity } = await import("../api/client.ts");
    const { APP_VERSION } = await import("./appVersion.ts");
    const seen: Array<Record<string, string>> = [];
    globalThis.fetch = ((_url: string, init?: RequestInit) => {
      seen.push(init?.headers as Record<string, string>);
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("{}") });
    }) as unknown as typeof fetch;
    await api.get("/api/onboarding");
    setAppIdentity({ version: APP_VERSION, build: "u.abcdef12", platform: "android" });
    await api.post("/api/onboarding/terms", { version: "x" });
    assert.match(seen[0]["X-Ascendra-App"], new RegExp(`^${APP_VERSION.replace(/\./g, "\\.")}\\+`));
    assert.equal(seen[1]["X-Ascendra-App"], `${APP_VERSION}+u.abcdef12`);
    assert.equal(seen[1]["X-Ascendra-Platform"], "android");
  });

  test("a 426 update_required calls the registered hook and still throws", async () => {
    const { registerUpdateRequiredHook } = await import("../api/client.ts");
    const got: unknown[] = [];
    registerUpdateRequiredHook((info) => got.push(info));
    globalThis.fetch = (() =>
      Promise.resolve({
        ok: false,
        status: 426,
        text: () => Promise.resolve(JSON.stringify({ error: "Please update Ascendra.", code: "update_required", minVersion: "9.0.0", storeUrl: null })),
      })) as unknown as typeof fetch;
    await assert.rejects(api.get("/api/onboarding"), (err: unknown) => err instanceof ApiError && err.status === 426);
    registerUpdateRequiredHook(null);
    assert.deepEqual(got, [{ message: "Please update Ascendra.", minVersion: "9.0.0", storeUrl: null }]);
  });
});
