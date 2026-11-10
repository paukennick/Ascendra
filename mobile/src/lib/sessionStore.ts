// REQ-192: where this device's refresh token lives and how a session ends.
// Pure rules, used by src/auth/AuthContext.tsx and tested in
// sessionStore.test.ts.
//
// Native: the token stays in the OS secure store (plain key, or the
// biometric-sealed key) and is sent in the request body, as before.
// Web: the token is an httpOnly cookie the server sets on /api/auth/refresh
// (backend/lib/auth/refreshCookie.ts). The page never sees or stores it.
// A tab from before REQ-192 may still hold one in sessionStorage: it is
// removed from storage first and exchanged once for the cookie, so a failed
// exchange can never be retried and loop; it then falls back to sign-in.

export type RefreshPlan =
  | { kind: "body"; token: string; migratingLegacy: boolean }
  | { kind: "cookie" }
  | { kind: "none" };

export function planRefresh(input: {
  web: boolean;
  memoryToken: string | null;
  storedToken: string | null;
}): RefreshPlan {
  if (input.web) {
    return input.storedToken ? { kind: "body", token: input.storedToken, migratingLegacy: true } : { kind: "cookie" };
  }
  const token = input.memoryToken ?? input.storedToken;
  return token ? { kind: "body", token, migratingLegacy: false } : { kind: "none" };
}

// The refresh token a sign-in or refresh answer hands this device to keep,
// or null when there is nothing to keep (web: it is in the cookie).
export function refreshTokenToKeep(web: boolean, res: { refreshToken?: unknown }): string | null {
  if (web) return null;
  return typeof res.refreshToken === "string" && res.refreshToken ? res.refreshToken : null;
}

export type LogoutCall =
  | { method: "DELETE"; path: "/api/auth/refresh" }
  | { method: "POST"; path: "/api/auth/logout"; body?: { refreshToken: string } };

// The server calls that end this device's session. Every platform revokes
// on the server -- biometric unlock included (before REQ-192 that session
// was left live for up to 30 days). With no readable refresh token (it is
// sealed behind the biometric prompt) the access token names the session.
export function logoutCalls(input: {
  web: boolean;
  refreshToken: string | null;
  legacyWebToken?: string | null;
  hasAccessToken: boolean;
}): LogoutCall[] {
  if (input.web) {
    const calls: LogoutCall[] = [{ method: "DELETE", path: "/api/auth/refresh" }];
    if (input.legacyWebToken) calls.push({ method: "POST", path: "/api/auth/logout", body: { refreshToken: input.legacyWebToken } });
    return calls;
  }
  if (input.refreshToken) return [{ method: "POST", path: "/api/auth/logout", body: { refreshToken: input.refreshToken } }];
  if (input.hasAccessToken) return [{ method: "POST", path: "/api/auth/logout" }];
  return [];
}

// Biometric unlock keeps two things on the device: the preference (stays
// on across a plain logout, so signing back in doesn't mean re-enabling it)
// and whether a sealed session is actually there. A logout ends the session
// and writes "0"; a sign-in with the preference on seals the new token and
// writes "1". Installs from before REQ-192 have no flag: their sealed token
// is still live, so a missing flag counts as sealed.
export const BIOMETRIC_SESSION_KEY = "ascendra_biometric_session";

export function sealedSessionPresent(flag: string | null): boolean {
  return flag !== "0";
}

export type LaunchState = "locked" | "resume";

export function launchStateFor(biometricOn: boolean, sessionFlag: string | null): LaunchState {
  return biometricOn && sealedSessionPresent(sessionFlag) ? "locked" : "resume";
}

// Web: tabs share one cookie, and a refresh token is spent on first use, so
// two tabs refreshing at once would read as token reuse and end the session
// everywhere. One refresh at a time across tabs (Web Locks); the second tab
// then sends the cookie the first one received. Where Web Locks are absent
// it runs unguarded (the worst case is a sign-in, never a leak).
export async function withRefreshLock<T>(fn: () => Promise<T>, locks: unknown = globalLocks()): Promise<T> {
  const l = locks as { request?: (name: string, cb: () => Promise<T>) => Promise<T> } | null;
  if (l && typeof l.request === "function") return l.request("ascendra-refresh", fn);
  return fn();
}

function globalLocks(): unknown {
  const nav = (globalThis as { navigator?: { locks?: unknown } }).navigator;
  return nav?.locks ?? null;
}
