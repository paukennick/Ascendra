import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { friendlyError, httpErrorMessage, NETWORK_MESSAGE, SERVER_MESSAGE, UNREADABLE_MESSAGE } from "./errorMessage.ts";

(globalThis as Record<string, unknown>).__DEV__ = false;
const { api, ApiError, NetworkError, registerAuthHooks } = await import("../api/client.ts");

// REQ-113 (Audit 3 mobile M7, FAIL-262): a portal page, a proxy error or no
// connection reaches the learner as one calm sentence, and the HTTP status
// survives so 401 refresh and 429 handling still run.

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});
const html = (status: number) => (async () => new Response("<html>Sign in to Wi-Fi</html>", { status })) as unknown as typeof fetch;

describe("API client failures (the audit's probe)", () => {
  test("an HTML page with status 200 is an ApiError with a calm message, not a SyntaxError", async () => {
    globalThis.fetch = html(200);
    await assert.rejects(api.get("/api/courses"), (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal((err as InstanceType<typeof ApiError>).status, 502);
      assert.equal((err as Error).message, UNREADABLE_MESSAGE);
      assert.doesNotMatch((err as Error).message, /Unexpected token|SyntaxError/);
      return true;
    });
  });

  test("an HTML page with status 502 keeps the 502", async () => {
    globalThis.fetch = html(502);
    await assert.rejects(api.get("/api/courses"), (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal((err as InstanceType<typeof ApiError>).status, 502);
      assert.equal((err as Error).message, UNREADABLE_MESSAGE);
      return true;
    });
  });

  test("offline is a NetworkError with the calm message", async () => {
    globalThis.fetch = (async () => {
      throw new TypeError("Network request failed");
    }) as unknown as typeof fetch;
    await assert.rejects(api.get("/api/courses"), (err: unknown) => {
      assert.ok(err instanceof NetworkError);
      assert.equal((err as Error).message, NETWORK_MESSAGE);
      return true;
    });
  });

  test("a 401 with a non-JSON body still triggers the session refresh (the status is no longer lost)", async () => {
    let refreshed = 0;
    let n = 0;
    registerAuthHooks({ getAccessToken: () => "t", refresh: async () => (refreshed++, true), onAuthExpired: () => undefined });
    globalThis.fetch = (async () => (n++ === 0 ? new Response("<html>401</html>", { status: 401 }) : new Response('{"ok":1}', { status: 200 }))) as unknown as typeof fetch;
    assert.deepEqual(await api.get("/api/courses"), { ok: 1 });
    assert.equal(refreshed, 1);
  });

  test("our own JSON error keeps its message (written for learners)", async () => {
    globalThis.fetch = (async () => new Response('{"error":"Wait a minute before trying again."}', { status: 429 })) as unknown as typeof fetch;
    await assert.rejects(api.get("/api/courses"), /Wait a minute/);
  });
});

describe("friendly messages", () => {
  test("raw errors become calm sentences; friendly ones pass through", () => {
    assert.equal(friendlyError(new SyntaxError("Unexpected token '<'")), UNREADABLE_MESSAGE);
    assert.equal(friendlyError(new TypeError("Network request failed")), NETWORK_MESSAGE);
    assert.equal(friendlyError("weird"), "Something didn't work. Try again in a moment.");
    assert.equal(friendlyError(new NetworkError(new Error("x"))), NETWORK_MESSAGE);
    const e = new ApiError("Course not found", 404, { error: "Course not found" });
    assert.equal(friendlyError(e), "Course not found");
    assert.match(friendlyError(new TypeError("Failed to fetch"), { kept: true }), /What you wrote is kept\.$/);
  });

  test("server errors (5xx) never show the server's internals", () => {
    assert.equal(httpErrorMessage(500, { error: "relation does not exist" }, true), SERVER_MESSAGE);
    assert.equal(httpErrorMessage(400, { error: "answer is required" }, true), "answer is required");
    assert.equal(httpErrorMessage(400, null, false), UNREADABLE_MESSAGE);
  });
});
