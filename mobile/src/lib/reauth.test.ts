// REQ-116 (audit 3): the "confirm it's you" prompt and the reissued access
// token after the server ends every other session.
import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { reauthPromptFor, reauthFields, needsReauth, linkGoogleBody, deleteAccountBody } from "./reauth.ts";

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

describe("REQ-203: who is asked, and what is sent", () => {
  test("anyone with a password, a code or a Google link is asked; two-factor being on is no longer required", () => {
    assert.equal(needsReauth({ hasPassword: true }), true);
    assert.equal(needsReauth({ hasPassword: true, mfaEnabled: false }), true);
    assert.equal(needsReauth({ hasPassword: false, googleLinked: true }), true);
    assert.equal(needsReauth({ mfaEnabled: true }), true);
    assert.equal(needsReauth({}), false);
    assert.equal(needsReauth(null), false);
  });

  test("connecting Google sends the new token as idToken and the typed proof as reauth", () => {
    const pw = reauthPromptFor({ hasPassword: true });
    assert.deepEqual(linkGoogleBody("tok", pw, " my pass "), { idToken: "tok", reauth: " my pass " });
    assert.deepEqual(linkGoogleBody("tok", pw, ""), { idToken: "tok" });
    // Nothing to type and no Google link to sign in with yet: only the token.
    assert.deepEqual(linkGoogleBody("tok", reauthPromptFor({ googleLinked: true }), "x"), { idToken: "tok" });
  });

  test("deleting: a password account sends password; a Google-only one sends a code or a Google token", () => {
    assert.deepEqual(deleteAccountBody({ hasPassword: true }, reauthPromptFor({ hasPassword: true }), "pw"), { password: "pw" });
    const code = { hasPassword: false, mfaEnabled: true, totpEnabled: true, googleLinked: true };
    assert.deepEqual(deleteAccountBody(code, reauthPromptFor(code), "123456"), { reauth: "123456" });
    const g = { hasPassword: false, googleLinked: true };
    assert.deepEqual(deleteAccountBody(g, reauthPromptFor(g), "idtok"), { googleIdToken: "idtok" });
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
