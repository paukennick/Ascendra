// REQ-177: the app locks after the learner has been away for a while, and
// asks them to confirm it's them before showing anything again.
//
// "Away" is:
//   native -- the app in the background (switched away, screen locked);
//   web    -- the tab hidden, or no input for that long.
// The lock is an overlay over the screens, not a navigation: whatever was on
// screen (a lesson half answered, a lab in progress) stays mounted and is
// there after unlocking. Unlock with biometrics (device passcode as the
// fallback) when biometric unlock is on, otherwise by re-entering the
// password (or a code, or Google, for accounts without one). Web's 30-minute
// idle sign-out is unchanged and still applies while locked.
//
// A restart cannot skip the lock: the time the app was last seen and an
// open lock are kept on the device, and a cold start that resumes a session
// locks when the learner was away long enough, or when no time was kept.
//
// Kept pure (no React Native import) so the rules can be tested.

export type LockAfter = "immediate" | "1" | "5" | "15";

export const LOCK_AFTER_OPTIONS: readonly LockAfter[] = ["immediate", "1", "5", "15"];
export const DEFAULT_LOCK_AFTER: LockAfter = "5";

// Device preferences, not per account (AsyncStorage; localStorage on web).
export const LOCK_AFTER_KEY = "ascendra_lock_after";
export const LAST_SEEN_KEY = "ascendra_last_seen_at";
export const LOCKED_KEY = "ascendra_app_locked";

// Android reports "background" for a permission dialog or the Google sign-in
// tab; shorter absences than this never lock, even on "Immediately".
export const MIN_AWAY_MS = 1500;

export function parseLockAfter(raw: unknown): LockAfter {
  return typeof raw === "string" && (LOCK_AFTER_OPTIONS as readonly string[]).includes(raw) ? (raw as LockAfter) : DEFAULT_LOCK_AFTER;
}

export function lockAfterMs(setting: LockAfter): number {
  return setting === "immediate" ? 0 : Number(setting) * 60_000;
}

export function lockAfterLabel(setting: LockAfter): string {
  if (setting === "immediate") return "Immediately";
  return setting === "1" ? "After 1 minute" : `After ${setting} minutes`;
}

// On coming back after `awayMs` in the background (or a hidden tab). `held`
// is true when the app opened another app for the learner (share sheet,
// photo picker; src/lib/backgroundHold.ts) and they came back within it.
export function shouldLockOnReturn(awayMs: number, setting: LockAfter, held = false): boolean {
  if (held) return false;
  if (!Number.isFinite(awayMs) || awayMs < MIN_AWAY_MS) return false;
  return awayMs >= lockAfterMs(setting);
}

// Web: no input for `idleMs` while the tab is open. "Immediately" has no
// idle meaning; it locks when the tab is hidden (shouldLockOnReturn) and
// after one minute without input.
export function shouldLockWhenIdle(idleMs: number, setting: LockAfter): boolean {
  const limit = Math.max(lockAfterMs(setting), 60_000);
  return idleMs >= limit;
}

// A cold start that resumes a session: lock when a lock was open, when the
// last-seen time is missing or unreadable, or when the learner was away long
// enough. A clock that went backwards counts as unknown.
//
// REQ-217 (FAIL-1066, accepted): on the web the lock marker and the last-seen
// time are in localStorage, so a person at the keyboard of an unlocked browser
// can edit them. Clearing the marker alone does not unlock: the last-seen time
// is not moved forward while the lock is up, so the elapsed time still locks
// (a missing last-seen time locks too). Getting past it takes editing both,
// and that person already has the signed-in page and its in-memory token in
// the console, so a deeper check would only look stronger than it is. The
// lock is a guard against someone walking up to an unattended screen, not
// against someone who can run code in the page. (autoLock.test.ts pins this.)
export function shouldLockOnColdStart(opts: {
  now: number;
  lastSeenAt: string | null;
  lockedFlag: string | null;
  setting: LockAfter;
}): boolean {
  if (opts.lockedFlag === "1") return true;
  const seen = opts.lastSeenAt === null ? NaN : Number(opts.lastSeenAt);
  if (!Number.isFinite(seen) || seen > opts.now) return true;
  return opts.now - seen >= Math.max(lockAfterMs(opts.setting), MIN_AWAY_MS);
}

export type UnlockMethod = "biometric" | "password";

export function unlockMethodFor(biometricEnabled: boolean, platform: string): UnlockMethod {
  return biometricEnabled && platform !== "web" ? "biometric" : "password";
}
