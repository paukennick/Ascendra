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

// REQ-212 (FAIL-1002): the ways a sealed session on this device can end, and
// which of them also turn the biometric preference off. Only "Sign out of all
// devices" is an explicit choice to drop this device's shortcut. Everything
// else ends the session and keeps the preference, so the next password
// sign-in seals the new session again -- the way a plain logout already
// worked (REQ-192). Before, "Use password instead" on the launch lock (the
// only way from the lock to the login and Create account screens) and a
// missing or rejected sealed token both switched biometrics off.
export type SealedSessionEnd = "logout" | "logoutAll" | "passwordInstead" | "sealedTokenMissing" | "sealedTokenRejected";

export function keepsBiometricPreference(reason: SealedSessionEnd): boolean {
  return reason !== "logoutAll";
}

// REQ-212 (FAIL-1003): the login screen's "Use <fingerprint>" button. It only
// works while a sealed session is on the device; after a logout (flag "0")
// there is nothing to unlock, and tapping it used to read the empty key and
// switch biometrics off.
export function showBiometricSignIn(available: boolean, enabled: boolean, sessionFlag: string | null): boolean {
  return available && enabled && sealedSessionPresent(sessionFlag);
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

// REQ-217 (FAIL-1040, FAIL-1041): what a failed refresh means. Only a 401 from
// /api/auth/refresh says the server has ended this session (the token is
// unknown, spent or expired); then the device signs out. Anything else --
// offline, a timeout, a 5xx, "update required" -- says nothing about the
// session, so the device keeps its token and the screen offers a retry. It
// used to sign out on every failure, so a train tunnel or a deploy cost the
// learner their session.
export type RefreshResult = boolean | { ok: false; expired: boolean; error?: unknown };
export type RefreshOutcome = "refreshed" | "expired" | "unavailable";

export function refreshOutcome(result: RefreshResult): RefreshOutcome {
  if (result === true) return "refreshed";
  if (result === false) return "expired";
  return result.expired ? "expired" : "unavailable";
}

export function refreshFailure(err: unknown): { ok: false; expired: boolean; error: unknown } {
  const status = err && typeof err === "object" ? (err as { status?: unknown }).status : undefined;
  return { ok: false, expired: status === 401, error: err };
}

// REQ-217 (FAIL-1042): the /api/auth/ routes a signed-out person calls. A 401
// from these is an answer about what was sent (wrong password, spent token),
// not "the access token expired", so the client never refreshes and resends
// them. Every other /api/auth/ route (me, unlock, logout-all, sessions, change
// password, the two-factor setup routes, Google link) needs the session and
// does refresh once on a 401. Before, the whole prefix was exempt, so "Sign out
// of all devices" failed on an expired access token and the app said it worked.
const SIGNED_OUT_AUTH_ROUTES: readonly RegExp[] = [
  /^\/api\/auth\/login$/,
  /^\/api\/auth\/register$/,
  /^\/api\/auth\/refresh$/,
  /^\/api\/auth\/logout$/, // names the session by its own token; works when the access token is stale
  /^\/api\/auth\/forgot-password$/,
  /^\/api\/auth\/reset-password$/,
  /^\/api\/auth\/resend-verification$/,
  /^\/api\/auth\/mfa\/verify$/,
  /^\/api\/auth\/mfa\/challenge(?:\/|$)/,
  /^\/api\/auth\/oauth\/google$/, // sign-in; "/google/link" is a signed-in route
];

export function isSignedOutAuthRoute(path: string): boolean {
  const bare = path.split("?")[0];
  return SIGNED_OUT_AUTH_ROUTES.some((r) => r.test(bare));
}

// REQ-217 (FAIL-1040): whether the rotated refresh token is written to the
// device now or marked for sealing later. With biometric unlock on, the sealed
// key needs the OS prompt for every write on Android (and every update on
// iOS), so a silent refresh never writes it: the live token stays in memory and
// is sealed when the app goes to the background.
export function rotationWrite(input: { biometricOn: boolean; sealSuspended: boolean }): "mark-dirty" | "plain" {
  return input.biometricOn && !input.sealSuspended ? "mark-dirty" : "plain";
}

// REQ-217 (FAIL-1063): biometric unlock seals the refresh token behind the OS
// prompt (expo-secure-store requireAuthentication), which on Android needs a
// STRONG biometric (class 3). A phone with only a weak one (some face unlocks)
// has hardware and an enrolment, so the switch was offered, and then every
// write failed. It is offered only where sealing can work. `strong` is null
// when this build can't tell (an older native module): then the earlier rule
// (hardware and enrolment) stands.
export function biometricOffered(input: { hardware: boolean; enrolled: boolean; strong: boolean | null }): boolean {
  return input.hardware && input.enrolled && input.strong !== false;
}
