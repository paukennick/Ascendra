// REQ-217 (FAIL-1040..1043, 1055, 1056): the phone's session handling. The
// pure rules are in src/lib/sessionStore.ts; the wiring in AuthContext, the
// API client and the screens can't be rendered here, so it is checked as source.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isSignedOutAuthRoute,
  refreshFailure,
  refreshOutcome,
  rotationWrite,
} from "./sessionStore.ts";
import { exportFitsShareSheet, MAX_SHARE_CHARS } from "./accountExport.ts";

(globalThis as { __DEV__?: boolean }).__DEV__ = false;
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

describe("a failed refresh signs out only on the server's 401 (FAIL-1041)", () => {
  test("outcomes", () => {
    assert.equal(refreshOutcome(true), "refreshed");
    assert.equal(refreshOutcome(false), "expired");
    assert.equal(refreshOutcome(refreshFailure({ status: 401 })), "expired");
    for (const status of [0, 400, 403, 426, 429, 500, 502, 503]) {
      assert.equal(refreshOutcome(refreshFailure({ status })), "unavailable", `status ${status}`);
    }
    assert.equal(refreshOutcome(refreshFailure(new Error("Network request failed"))), "unavailable");
    assert.equal(refreshOutcome(refreshFailure(null)), "unavailable");
  });
  test("the client keeps the session and throws the refresh failure to the screen", async () => {
    const { api, ApiError, NetworkError, registerAuthHooks } = await import("../api/client.ts");
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: "expired" }), { status: 401 })) as typeof fetch;
    try {
      let expired = 0;
      const offline = new NetworkError(new Error("Network request failed"));
      registerAuthHooks({ getAccessToken: () => "t", refresh: async () => refreshFailure(offline), onAuthExpired: () => void expired++ });
      await assert.rejects(api.get("/api/units"), (e: unknown) => e === offline);
      assert.equal(expired, 0, "an unreachable server does not sign out");

      registerAuthHooks({ getAccessToken: () => "t", refresh: async () => refreshFailure(new ApiError("no", 401, null)), onAuthExpired: () => void expired++ });
      await assert.rejects(api.get("/api/units"), (e: unknown) => e instanceof ApiError && e.status === 401);
      assert.equal(expired, 1, "the server's 401 signs out");

      registerAuthHooks({ getAccessToken: () => "t", refresh: async () => false, onAuthExpired: () => void expired++ });
      await assert.rejects(api.get("/api/units"));
      assert.equal(expired, 2, "a plain false still means signed out");
    } finally {
      globalThis.fetch = realFetch;
    }
  });
  test("a cold start keeps the token and shows a retry state; a throwing storage read cannot hang the launch", () => {
    const src = read("../auth/AuthContext.tsx");
    const resume = src.slice(src.indexOf("const resumeSession = useCallback"), src.indexOf("const restoreSession = useCallback"));
    assert.match(resume, /setStatus\("retry"\)/);
    assert.match(resume, /err\.status === 401\) \{\s*await clearAuth\(\);/, "only a 401 from /me signs out");
    assert.match(src, /getItem\(BIOMETRIC_ENABLED_KEY\)\.catch\(\(\) => null\)/, "the launch read is guarded");
  });
});

describe("only signed-out routes skip refresh-and-retry (FAIL-1042)", () => {
  test("signed-out routes", () => {
    for (const p of [
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/refresh",
      "/api/auth/logout",
      "/api/auth/forgot-password",
      "/api/auth/reset-password",
      "/api/auth/resend-verification",
      "/api/auth/mfa/verify",
      "/api/auth/mfa/challenge/send-email-code",
      "/api/auth/oauth/google",
    ]) {
      assert.equal(isSignedOutAuthRoute(p), true, p);
    }
  });
  test("signed-in /api/auth routes refresh and retry", () => {
    for (const p of [
      "/api/auth/logout-all",
      "/api/auth/me",
      "/api/auth/unlock",
      "/api/auth/sessions",
      "/api/auth/sessions/abc",
      "/api/auth/change-password",
      "/api/auth/mfa/setup",
      "/api/auth/mfa/enable",
      "/api/auth/mfa/disable",
      "/api/auth/mfa/backup-codes",
      "/api/auth/mfa/email/setup",
      "/api/auth/oauth/google/link",
    ]) {
      assert.equal(isSignedOutAuthRoute(p), false, p);
    }
    assert.equal(isSignedOutAuthRoute("/api/auth/login?x=1"), true);
  });
  test("a 401 on logout-all is refreshed and resent; a 401 on login is not", async () => {
    const { api, registerAuthHooks } = await import("../api/client.ts");
    const realFetch = globalThis.fetch;
    const calls: string[] = [];
    let fresh = false;
    globalThis.fetch = (async (url: string) => {
      calls.push(String(url).replace(/^.*\/api/, "/api"));
      if (String(url).endsWith("/logout-all")) {
        return fresh ? new Response(JSON.stringify({ success: true }), { status: 200 }) : new Response("{}", { status: 401 });
      }
      return new Response(JSON.stringify({ error: "wrong password" }), { status: 401 });
    }) as typeof fetch;
    try {
      let refreshes = 0;
      registerAuthHooks({ getAccessToken: () => "t", refresh: async () => (refreshes++, (fresh = true)), onAuthExpired: () => undefined });
      await api.post("/api/auth/logout-all");
      assert.deepEqual(calls, ["/api/auth/logout-all", "/api/auth/logout-all"]);
      assert.equal(refreshes, 1);
      await assert.rejects(api.post("/api/auth/login", { email: "a", password: "b" }));
      assert.equal(refreshes, 1, "login's 401 never refreshes");
    } finally {
      globalThis.fetch = realFetch;
    }
  });
  test("Sign out of all devices reports success only when the server answered 200", () => {
    const src = read("../auth/AuthContext.tsx");
    const fn = src.slice(src.indexOf("const logoutAll = useCallback"), src.indexOf("// REQ-177: native -- time in the background"));
    assert.doesNotMatch(fn, /logout-all"\)\.catch/, "the call's failure is not swallowed");
    assert.ok(fn.indexOf('await api.post("/api/auth/logout-all")') < fn.indexOf("await clearAuth()"), "the phone is cleared after the server answered");
    assert.match(fn, /return \{ ok: false/);
    const account = read("../../app/(app)/account.tsx");
    assert.match(account, /const res = await logoutAll\(\);\s*if \(!res\.ok\) Alert\.alert/);
  });
});

describe("a silent refresh does not write the sealed key (FAIL-1040)", () => {
  test("with biometric on the rotated token is marked, with it off it is written plain", () => {
    assert.equal(rotationWrite({ biometricOn: true, sealSuspended: false }), "mark-dirty");
    assert.equal(rotationWrite({ biometricOn: false, sealSuspended: false }), "plain");
    assert.equal(rotationWrite({ biometricOn: true, sealSuspended: true }), "plain", "after a failed seal the session is on the plain key");
  });
  test("the refresh path has no sealed write, and a storage failure never signs out", () => {
    const src = read("../auth/AuthContext.tsx");
    const refresh = src.slice(src.indexOf("const attempt = withRefreshLock"), src.indexOf("inFlightRefresh.current = attempt"));
    assert.doesNotMatch(refresh, /REFRESH_TOKEN_SECURE_KEY|SEAL_OPTIONS/);
    const afterExchange = refresh.slice(refresh.indexOf("accessTokenRef.current = res.accessToken"));
    assert.doesNotMatch(afterExchange, /clearAuth/, "nothing after a successful rotation signs out");
    assert.match(afterExchange, /catch \(err\) \{\s*console\.warn/);
  });
  test("the sealed key is written at sign-in, unlock and when the app goes to the background", () => {
    const src = read("../auth/AuthContext.tsx");
    const store = src.slice(src.indexOf("const storeSessionToken = useCallback"), src.indexOf("const refresh = useCallback"));
    assert.match(store, /SEAL_OPTIONS/);
    assert.match(store, /catch \{\s*sealSuspendedRef\.current = true;\s*await secureStorage\.setItem\(REFRESH_TOKEN_KEY, token\)/, "a failed seal keeps the session on the plain key");
    const apply = src.slice(src.indexOf("const applySession = useCallback"), src.indexOf("type LoginResponse"));
    assert.match(apply, /storeSessionToken\(keep\)/);
    const unlock = src.slice(src.indexOf("const unlockWithBiometric = useCallback"), src.indexOf("const unlockMethod"));
    assert.match(unlock, /storeSessionToken\(res\.refreshToken\)/);
    assert.doesNotMatch(unlock, /secureStorage\.setItem\(REFRESH_TOKEN_SECURE_KEY/);
    const appState = src.slice(src.indexOf("AppState.addEventListener"), src.indexOf("return () => sub.remove();"));
    assert.match(appState, /sealDirtyRef\.current && refreshTokenRef\.current/);
  });
});

describe("the data export respects the share sheet's size limit (FAIL-1055)", () => {
  test("small exports share; large ones go to the web download", () => {
    assert.equal(exportFitsShareSheet("x".repeat(MAX_SHARE_CHARS)), true);
    assert.equal(exportFitsShareSheet("x".repeat(MAX_SHARE_CHARS + 1)), false);
    const account = read("../../app/(app)/account.tsx");
    assert.match(account, /if \(!exportFitsShareSheet\(text\)\)/);
  });
});

describe("Google sign-in on the account screen holds off the lock (FAIL-1056)", () => {
  test("every signInAsync call is inside withBackgroundHold", () => {
    for (const f of ["../../app/(app)/account.tsx", "../../app/(app)/settings/mfa.tsx"]) {
      const src = read(f);
      const calls = src.match(/[sS]ignInAsync\(\)/g) ?? [];
      const held = src.match(/withBackgroundHold\(\(\) => \w*[sS]ignInAsync\(\)\)/g) ?? [];
      assert.equal(held.length, calls.length, f);
    }
  });
});
