// REQ-206 (FAIL-934): sign-in passes two things to the next screen that must
// not sit in the address bar: the learner's email (to the "verify your email"
// screen) and the one-time MFA challenge token. A URL is kept in browser
// history, shown on screen, and sent to the page's own scripts and logs. They
// are handed over here, in memory only, instead of as route params.
//
// Nothing is written to storage. After a reload the values are gone, and the
// receiving screen says so: the challenge screen returns to sign-in, the verify
// screen drops its "resend" button (the learner signs in again to get it back).

export interface MfaHandoff {
  challengeToken: string;
  totp: boolean;
  email: boolean;
}

let mfa: MfaHandoff | null = null;
let verifyEmail: string | null = null;

export function setMfaHandoff(h: MfaHandoff): void {
  mfa = { ...h };
}
export function getMfaHandoff(): MfaHandoff | null {
  return mfa ? { ...mfa } : null;
}
export function clearMfaHandoff(): void {
  mfa = null;
}

export function setVerifyEmailHandoff(email: string): void {
  verifyEmail = email.trim() || null;
}
export function getVerifyEmailHandoff(): string | null {
  return verifyEmail;
}
export function clearVerifyEmailHandoff(): void {
  verifyEmail = null;
}

// The shape login returns for an MFA step, turned into a handoff (or null when
// it has no usable token).
export function mfaHandoffFrom(result: {
  mfaRequired?: boolean;
  challengeToken?: string;
  mfaMethods?: { totp?: boolean; email?: boolean };
}): MfaHandoff | null {
  if (!result.mfaRequired || typeof result.challengeToken !== "string" || !result.challengeToken) return null;
  return {
    challengeToken: result.challengeToken,
    totp: !!result.mfaMethods?.totp,
    email: !!result.mfaMethods?.email,
  };
}
