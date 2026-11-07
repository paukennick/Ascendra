// What, if anything, should stop the learner leaving the two-factor screen.
// Kept pure so the rule can be tested; settings/mfa.tsx wires it to the
// navigation "beforeRemove" event (back button, header back, Android
// hardware back, or any router call that would remove the screen).
//
// REQ-093:
//  - "codes": backup codes are on screen. They are shown once and are never
//    stored, so leaving without saving them locks the learner out of the
//    recovery path for good.
//  - "setup": an authenticator/email setup has started but not been
//    confirmed; leaving abandons it (the backend keeps nothing enabled).
//  - null: nothing at stake.
//
// Never guard once the learner is no longer signed in (logout, session
// expiry, background sign-out, biometric lock, web idle sign-out): those
// remove the screen on purpose, and keeping it would leave backup codes on
// screen for a signed-out or locked device (Audit 2, FAIL-060).

// "totp-reauth" (REQ-116): confirming it's you before adding an authenticator
// while two-factor is already on. Nothing has started yet, so no guard.
export type MfaView = "status" | "totp-reauth" | "totp-setup" | "email-setup" | "backup-codes" | "disable" | "regenerate";
export type MfaLeaveGuard = "codes" | "setup" | null;

export function mfaLeaveGuard(view: MfaView, allowLeave: boolean, signedIn = true): MfaLeaveGuard {
  if (allowLeave || !signedIn) return null;
  if (view === "backup-codes") return "codes";
  if (view === "totp-setup" || view === "email-setup") return "setup";
  return null;
}

// True when a share sheet was simply dismissed. On web, react-native-web's
// Share uses navigator.share, which rejects with an AbortError when the
// learner cancels; that showed "Couldn't open sharing" for a deliberate
// cancel (Audit 2 mobile item 14, FAIL-069). Native resolves with
// dismissedAction instead of rejecting.
export function isShareDismissal(err: unknown): boolean {
  return !!err && typeof err === "object" && (err as { name?: unknown }).name === "AbortError";
}

// One string for Copy and Share: a code per line, no decoration, so it
// pastes cleanly into a password manager or notes app.
export function backupCodesText(codes: readonly string[]): string {
  return codes.join("\n");
}
