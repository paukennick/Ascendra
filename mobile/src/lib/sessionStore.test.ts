// REQ-192: where the refresh token lives, how a session ends, and the lock
// drawn above sheets (src/lib/sessionStore.ts; static checks on the wiring
// in AuthContext, the API client and the sheets, which tests can't render).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  launchStateFor,
  logoutCalls,
  planRefresh,
  refreshTokenToKeep,
  sealedSessionPresent,
  withRefreshLock,
} from "./sessionStore.ts";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

describe("refresh", () => {
  test("native sends the token it holds in the body, as before", () => {
    assert.deepEqual(planRefresh({ web: false, memoryToken: "m", storedToken: "s" }), { kind: "body", token: "m", migratingLegacy: false });
    assert.deepEqual(planRefresh({ web: false, memoryToken: null, storedToken: "s" }), { kind: "body", token: "s", migratingLegacy: false });
    assert.deepEqual(planRefresh({ web: false, memoryToken: null, storedToken: null }), { kind: "none" });
  });
  test("web uses the cookie, and exchanges a token an old version left in sessionStorage once", () => {
    assert.deepEqual(planRefresh({ web: true, memoryToken: null, storedToken: null }), { kind: "cookie" });
    assert.deepEqual(planRefresh({ web: true, memoryToken: "ignored", storedToken: "old" }), { kind: "body", token: "old", migratingLegacy: true });
  });
  test("web never keeps a refresh token; native keeps the one it is given", () => {
    assert.equal(refreshTokenToKeep(true, { refreshToken: "x" }), null);
    assert.equal(refreshTokenToKeep(true, {}), null);
    assert.equal(refreshTokenToKeep(false, { refreshToken: "x" }), "x");
    assert.equal(refreshTokenToKeep(false, {}), null);
  });
  test("the old token leaves storage before it is sent, so a failed exchange cannot loop", () => {
    const src = read("../auth/AuthContext.tsx");
    const refresh = src.slice(src.indexOf("const attempt = withRefreshLock"), src.indexOf("inFlightRefresh.current = attempt"));
    const del = refresh.indexOf("plan.migratingLegacy) await secureStorage.deleteItem(REFRESH_TOKEN_KEY)");
    const post = refresh.indexOf('api.post<{ accessToken: string; refreshToken?: string }>(');
    assert.ok(del > 0 && post > del, "delete before the request");
    assert.match(refresh, /catch \{\s*await clearAuth\(\);\s*return false;/, "a failed exchange signs out, it does not retry");
    // The web app never writes the refresh token to storage.
    assert.doesNotMatch(src, /secureStorage\.setItem\(REFRESH_TOKEN_KEY, res\.refreshToken\)/);
  });
  test("tabs refresh one at a time when Web Locks exist, and unguarded otherwise", async () => {
    const order: string[] = [];
    let held = Promise.resolve();
    const locks = {
      request: (_name: string, cb: () => Promise<unknown>) => {
        const run = held.then(cb);
        held = run.then(() => undefined, () => undefined);
        return run;
      },
    };
    const slow = (tag: string) => async () => {
      order.push(`${tag}:start`);
      await new Promise((r) => setTimeout(r, 5));
      order.push(`${tag}:end`);
      return tag;
    };
    await Promise.all([withRefreshLock(slow("a"), locks), withRefreshLock(slow("b"), locks)]);
    assert.deepEqual(order, ["a:start", "a:end", "b:start", "b:end"]);
    assert.equal(await withRefreshLock(async () => 7, null), 7);
  });
  test("web requests carry credentials so the cookie is sent and stored; native never does", () => {
    const client = read("../api/client.ts");
    assert.match(client, /isWebClient\(\) \? \{ credentials: "include" as const \} : \{\}/);
  });
});

describe("logout ends the session on the server on every platform", () => {
  test("native with a readable token revokes it", () => {
    assert.deepEqual(logoutCalls({ web: false, refreshToken: "r", hasAccessToken: true }), [
      { method: "POST", path: "/api/auth/logout", body: { refreshToken: "r" } },
    ]);
  });
  test("native with only the access token (biometric-sealed token) ends that session", () => {
    assert.deepEqual(logoutCalls({ web: false, refreshToken: null, hasAccessToken: true }), [{ method: "POST", path: "/api/auth/logout" }]);
    assert.deepEqual(logoutCalls({ web: false, refreshToken: null, hasAccessToken: false }), []);
  });
  test("web ends the cookie session, and an old sessionStorage one too", () => {
    assert.deepEqual(logoutCalls({ web: true, refreshToken: null, hasAccessToken: false }), [{ method: "DELETE", path: "/api/auth/refresh" }]);
    assert.deepEqual(logoutCalls({ web: true, refreshToken: null, legacyWebToken: "old", hasAccessToken: true }), [
      { method: "DELETE", path: "/api/auth/refresh" },
      { method: "POST", path: "/api/auth/logout", body: { refreshToken: "old" } },
    ]);
  });
  test("biometric unlock no longer skips the server call (FAIL-690)", () => {
    const src = read("../auth/AuthContext.tsx");
    const end = src.slice(src.indexOf("const endSession = useCallback"), src.indexOf("const logout = useCallback"));
    assert.doesNotMatch(end, /if \(biometricEnabledRef\.current\) \{\s*await clearAuth\(\);\s*return;/);
    assert.ok(end.indexOf("logoutCalls(") < end.indexOf("await clearAuth()"), "revoke before local state is cleared");
    assert.match(end, /deleteItem\(REFRESH_TOKEN_SECURE_KEY\)/, "the sealed copy of the revoked token is deleted");
    assert.match(end, /setItem\(BIOMETRIC_SESSION_KEY, "0"\)/);
  });
  test("after a logout the biometric preference stays but launch goes to sign-in, not the lock", () => {
    assert.equal(launchStateFor(true, "0"), "resume");
    assert.equal(launchStateFor(true, "1"), "locked");
    assert.equal(launchStateFor(true, null), "locked", "installs from before the flag keep their sealed session");
    assert.equal(launchStateFor(false, "1"), "resume");
    assert.equal(sealedSessionPresent(null), true);
  });
});

describe("the lock is drawn above sheets (FAIL-691)", () => {
  const root = fileURLToPath(new URL("../..", import.meta.url));
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const p = join(dir, name);
      if (name === "node_modules" || name.startsWith(".")) return [];
      return statSync(p).isDirectory() ? files(p) : /\.tsx$/.test(name) ? [p] : [];
    });
  }
  test("no screen or component opens a raw React Native Modal", () => {
    const offenders = [...files(join(root, "app")), ...files(join(root, "src"))]
      .filter((p) => !p.endsWith("SheetModal.tsx"))
      .filter((p) => /<Modal[\s>]/.test(readFileSync(p, "utf8")));
    assert.deepEqual(offenders, []);
  });
  test("SheetModal hides while the lock is up and keeps its opener mounted", () => {
    const src = read("../components/SheetModal.tsx");
    assert.match(src, /visible=\{visible && !locked\}/);
    const ctx = read("../auth/AuthContext.tsx");
    assert.match(ctx, /return !!ctx && ctx\.status === "signedIn" && ctx\.appLocked;/);
  });
});
