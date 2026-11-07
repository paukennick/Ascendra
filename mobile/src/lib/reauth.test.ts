// REQ-116 (audit 3): the "confirm it's you" prompt and the reissued access
// token after the server ends every other session.
import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { reauthPromptFor, reauthFields } from "./reauth.ts";

(globalThis as Record<string, unknown>).__DEV__ = false;
const { api, registerAuthHooks, reissuedAccessToken } = await import("../api/client.ts");

describe("reauthPromptFor", () => {
  test("a password account types its password (codes also accepted when two-factor is on)", () => {
    const p = reauthPromptFor({ hasPassword: true });
    assert.equal(p.kind, "secret");
    assert.equal(p.kind === "secret" && p.secure, true);
    assert.match(reauthPromptFor({ hasPassword: true, mfaEnabled: true }).hint, /authenticator app/);
  });

  test("a Google-only account with two-factor types a code; without it, signs in with Google", () => {
    const code = reauthPromptFor({ hasPassword: false, mfaEnabled: true, totpEnabled: true, googleLinked: true });
    assert.equal(code.kind, "secret");
    assert.equal(code.kind === "secret" && code.secure, false);
    assert.equal(reauthPromptFor({ hasPassword: false, mfaEnabled: true, totpEnabled: false }).label, "Backup code");
    assert.equal(reauthPromptFor({ hasPassword: false, googleLinked: true }).kind, "google");
  });

  test("fields: a password is sent exactly as typed; Google sends the id token", () => {
    assert.deepEqual(reauthFields(reauthPromptFor({ hasPassword: true }), " pass word "), { reauth: " pass word " });
    assert.deepEqual(reauthFields(reauthPromptFor({ googleLinked: true }), "tok"), { googleIdToken: "tok" });
  });
});

describe("reissued access token", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test("only an accessToken without a refreshToken counts as reissued", () => {
    assert.equal(reissuedAccessToken({ accessToken: "a" }), "a");
    assert.equal(reissuedAccessToken({ accessToken: "a", refreshToken: "r" }), null);
    assert.equal(reissuedAccessToken({ enabled: true }), null);
    assert.equal(reissuedAccessToken(null), null);
  });

  test("the client hands it to AuthContext so the next request uses it", async () => {
    let current: string | null = "old";
    registerAuthHooks({
      getAccessToken: () => current,
      refresh: async () => false,
      onAuthExpired: () => undefined,
      setAccessToken: (t) => {
        current = t;
      },
    });
    const seen: string[] = [];
    globalThis.fetch = (async (_u: string, init?: RequestInit) => {
      seen.push(String((init?.headers as Record<string, string>).Authorization));
      return new Response(JSON.stringify({ enabled: true, backupCodes: [], accessToken: "fresh" }), { status: 200 });
    }) as unknown as typeof fetch;
    await api.post("/api/auth/mfa/enable", { code: "123456" });
    await api.get("/api/auth/me");
    assert.deepEqual(seen, ["Bearer old", "Bearer fresh"]);
  });
});
