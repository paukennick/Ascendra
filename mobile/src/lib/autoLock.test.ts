// REQ-177: the lock after time away -- the rules (src/lib/autoLock.ts) and
// the wiring that keeps in-progress work (static checks on AuthContext and
// the root layout, which tests can't render).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULT_LOCK_AFTER,
  LOCK_AFTER_OPTIONS,
  MIN_AWAY_MS,
  lockAfterLabel,
  lockAfterMs,
  parseLockAfter,
  shouldLockOnColdStart,
  shouldLockOnReturn,
  shouldLockWhenIdle,
  unlockMethodFor,
} from "./autoLock.ts";

const MIN = 60_000;
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

describe("settings", () => {
  test("Immediately, 1, 5 and 15 minutes; 5 by default; junk falls back to the default", () => {
    assert.deepEqual([...LOCK_AFTER_OPTIONS], ["immediate", "1", "5", "15"]);
    assert.equal(DEFAULT_LOCK_AFTER, "5");
    assert.equal(parseLockAfter(null), "5");
    assert.equal(parseLockAfter("30"), "5");
    assert.equal(parseLockAfter("15"), "15");
    assert.equal(lockAfterMs("immediate"), 0);
    assert.equal(lockAfterMs("15"), 15 * MIN);
    assert.deepEqual(LOCK_AFTER_OPTIONS.map(lockAfterLabel), ["Immediately", "After 1 minute", "After 5 minutes", "After 15 minutes"]);
  });
});

describe("returning from the background or a hidden tab", () => {
  test("locks at the chosen time, not before", () => {
    assert.equal(shouldLockOnReturn(5 * MIN - 1, "5"), false);
    assert.equal(shouldLockOnReturn(5 * MIN, "5"), true);
    assert.equal(shouldLockOnReturn(2 * MIN, "1"), true);
    assert.equal(shouldLockOnReturn(14 * MIN, "15"), false);
  });

  test("Immediately still ignores a permission dialog or the Google tab's blip", () => {
    assert.equal(shouldLockOnReturn(MIN_AWAY_MS - 1, "immediate"), false);
    assert.equal(shouldLockOnReturn(MIN_AWAY_MS, "immediate"), true);
  });

  test("a return inside a background hold (share sheet, photo picker) never locks", () => {
    assert.equal(shouldLockOnReturn(10 * MIN, "1", true), false);
  });

  test("nonsense durations don't lock", () => {
    assert.equal(shouldLockOnReturn(Number.NaN, "immediate"), false);
    assert.equal(shouldLockOnReturn(-5, "immediate"), false);
  });
});

describe("web idle", () => {
  test("idle locks at the setting, at least one minute (Immediately has no idle meaning)", () => {
    assert.equal(shouldLockWhenIdle(59_999, "immediate"), false);
    assert.equal(shouldLockWhenIdle(MIN, "immediate"), true);
    assert.equal(shouldLockWhenIdle(5 * MIN - 1, "5"), false);
    assert.equal(shouldLockWhenIdle(5 * MIN, "5"), true);
  });
});

describe("a restart can't skip the lock", () => {
  const now = 1_800_000_000_000;
  test("an open lock stays locked", () => {
    assert.equal(shouldLockOnColdStart({ now, lastSeenAt: String(now), lockedFlag: "1", setting: "15" }), true);
  });
  test("missing, unreadable or future last-seen times lock", () => {
    for (const lastSeenAt of [null, "", "abc", String(now + 1000)]) {
      assert.equal(shouldLockOnColdStart({ now, lastSeenAt, lockedFlag: null, setting: "15" }), true, String(lastSeenAt));
    }
  });
  test("a quick reopen resumes; a long absence locks", () => {
    assert.equal(shouldLockOnColdStart({ now, lastSeenAt: String(now - 2 * MIN), lockedFlag: null, setting: "5" }), false);
    assert.equal(shouldLockOnColdStart({ now, lastSeenAt: String(now - 5 * MIN), lockedFlag: null, setting: "5" }), true);
    assert.equal(shouldLockOnColdStart({ now, lastSeenAt: String(now - 5000), lockedFlag: null, setting: "immediate" }), true);
  });
});

describe("unlock method", () => {
  test("biometrics on native when enrolled, the password otherwise and always on web", () => {
    assert.equal(unlockMethodFor(true, "android"), "biometric");
    assert.equal(unlockMethodFor(false, "ios"), "password");
    assert.equal(unlockMethodFor(true, "web"), "password");
  });
});

describe("wiring (static)", () => {
  const auth = read("../auth/AuthContext.tsx");
  const layout = read("../../app/_layout.tsx");
  test("going to the background no longer signs out or navigates to /lock", () => {
    const native = auth.slice(auth.indexOf("REQ-177: native"), auth.indexOf("Web's counterpart"));
    assert.ok(native.length > 0);
    assert.doesNotMatch(native, /endSession\(|setStatus\("locked"\)|logout\(/);
    assert.match(native, /shouldLockOnReturn\(/);
    assert.match(native, /backgroundHold\.isHeld\(/);
  });
  test("web keeps the 30-minute hard sign-out and locks before it", () => {
    assert.match(auth, /WEB_IDLE_LIMIT_MS = 30 \* 60 \* 1000/);
    assert.match(auth, /shouldLockWhenIdle\(/);
    assert.match(auth, /visibilitychange/);
  });
  test("a resumed cold start checks the lock; sign-in and sign-out clear it", () => {
    assert.match(auth, /shouldLockOnColdStart\(/);
    assert.match(auth, /multiRemove\(\[LOCKED_KEY, LAST_SEEN_KEY\]\)/);
  });
  test("the lock is an overlay over mounted screens, not a navigation", () => {
    assert.match(layout, /status === "signedIn" && appLocked \? <AppLock \/>/);
  });
});
