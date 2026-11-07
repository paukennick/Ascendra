// On a device without biometric unlock, going to the background signs the
// learner out after a 1.5 s grace period (src/auth/AuthContext.tsx). Android
// also reports "background" when Ascendra itself opens another app on the
// learner's behalf: the share sheet (backup codes, data export) and the photo
// library or camera. Sharing backup codes to a notes app took longer than the
// grace period, so the learner came back signed out, mid-task (Audit 2
// mobile item 2, FAIL-062).
//
// A screen that opens one of those wraps it in a hold. While a hold is open,
// a background sign-out waits until the hold expires instead of the usual
// grace period. The hold ends when:
//  - the app is active again after going to the background (AuthContext
//    calls clear()): the learner is back;
//  - the opener settled without the app ever going to the background (the
//    iOS share sheet is drawn inside the app), checked SETTLE_CHECK_MS later;
//  - it expires. It is bounded on purpose: an open-ended hold would let
//    someone who walks off with an unlocked phone past a share sheet keep
//    the session. A learner who never comes back is still signed out, later.
//
// Kept pure (no React Native import) so the rules can be tested.

export const BACKGROUND_HOLD_MAX_MS = 2 * 60 * 1000;
// Android's Share.share resolves as soon as the chooser is launched, a
// moment BEFORE the app reports "background". Waiting this long after the
// opener settles tells that apart from a sheet that never left the app.
export const SETTLE_CHECK_MS = 1000;

export interface BackgroundHold {
  // Opens a hold (extending any open one). Returns a token for settle().
  begin(now: number, maxMs?: number): number;
  // The app went to the background (while a hold may be open).
  noteBackground(): void;
  // The opener with this token settled. Ends the hold if the app never went
  // to the background since it began, and no newer hold has begun.
  settle(token: number): void;
  // Ends any hold: the learner is back in the app.
  clear(): void;
  // ms to wait before a background sign-out that starts at `now`.
  signOutDelay(now: number, graceMs: number): number;
  isHeld(now: number): boolean;
}

export function createBackgroundHold(): BackgroundHold {
  let heldUntil = 0;
  let generation = 0;
  let backgrounded = false;
  return {
    begin(now, maxMs = BACKGROUND_HOLD_MAX_MS) {
      heldUntil = Math.max(heldUntil, now + Math.max(0, maxMs));
      backgrounded = false;
      generation += 1;
      return generation;
    },
    noteBackground() {
      backgrounded = true;
    },
    settle(token) {
      if (token === generation && !backgrounded) heldUntil = 0;
    },
    clear() {
      heldUntil = 0;
      backgrounded = false;
    },
    signOutDelay(now, graceMs) {
      return Math.max(graceMs, heldUntil - now);
    },
    isHeld(now) {
      return heldUntil > now;
    },
  };
}

// The one hold the app uses; AuthContext reads it, screens open it.
export const backgroundHold = createBackgroundHold();

// Runs `open` (a share sheet, an image picker, a permission prompt) with the
// background sign-out held off. See the rules above for when the hold ends.
export async function withBackgroundHold<T>(
  open: () => Promise<T>,
  hold: BackgroundHold = backgroundHold,
  now: () => number = Date.now
): Promise<T> {
  const token = hold.begin(now());
  try {
    return await open();
  } finally {
    setTimeout(() => hold.settle(token), SETTLE_CHECK_MS);
  }
}
