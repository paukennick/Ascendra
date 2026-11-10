// REQ-116 (audit 3): what the app asks for when the server needs the learner
// to confirm it's them -- changing the email address, or adding an
// authenticator (backend lib/auth/reauth.ts). REQ-203 adds the places that
// used to need only the session: adding an authenticator with two-factor off,
// connecting a Google account, and deleting a Google-only account.
// Kept pure so the choice can be tested.
//
//  - An account with a password types it (or, with two-factor on, a code
//    from the authenticator app or a backup code; the server accepts any).
//  - A Google-only account with two-factor on types a code.
//  - A Google-only account without two-factor signs in with Google again.

export interface ReauthUser {
  hasPassword?: boolean;
  mfaEnabled?: boolean;
  totpEnabled?: boolean;
  googleLinked?: boolean;
}

export type ReauthPrompt =
  | { kind: "secret"; label: string; hint: string; secure: boolean }
  | { kind: "google"; label: string; hint: string };

export function reauthPromptFor(user: ReauthUser | null | undefined): ReauthPrompt {
  if (user?.hasPassword) {
    return {
      kind: "secret",
      label: "Current password",
      hint: user.mfaEnabled
        ? "To confirm it's you, enter your password, a code from your authenticator app, or a backup code."
        : "To confirm it's you, enter your password.",
      secure: true,
    };
  }
  if (user?.mfaEnabled) {
    return {
      kind: "secret",
      label: user.totpEnabled ? "Authenticator or backup code" : "Backup code",
      hint: user.totpEnabled
        ? "To confirm it's you, enter a code from your authenticator app or a backup code."
        : "To confirm it's you, enter one of your backup codes.",
      secure: false,
    };
  }
  return {
    kind: "google",
    label: "Confirm with Google",
    hint: "To confirm it's you, sign in with Google again.",
  };
}

// The request fields for what the learner gave.
export function reauthFields(prompt: ReauthPrompt, value: string): { reauth?: string; googleIdToken?: string } {
  // A password is sent exactly as typed (it may contain spaces).
  return prompt.kind === "google" ? { googleIdToken: value } : { reauth: value };
}

// REQ-203 (FAIL-860): the server asks anyone who has a way to prove it
// (a password, a code, or a linked Google account) before adding an
// authenticator, whether or not two-factor is already on.
export function needsReauth(user: ReauthUser | null | undefined): boolean {
  return !!(user?.hasPassword || user?.mfaEnabled || user?.googleLinked);
}

// REQ-203 (FAIL-861): connecting Google sends the NEW identity's ID token as
// `idToken` and the proof as `reauth`. Google can't prove an account that has
// no Google link yet, so with no password or code the proof is left out and
// the server answers with what it needs.
export function linkGoogleBody(idToken: string, prompt: ReauthPrompt, secret: string): { idToken: string; reauth?: string } {
  return prompt.kind === "secret" && secret ? { idToken, reauth: secret } : { idToken };
}

// REQ-203 (FAIL-870): deleting the account. A password account sends its
// password as before; any other account sends the same proof as the other
// confirm-it's-you screens (a code, or a fresh Google ID token).
export function deleteAccountBody(
  user: ReauthUser | null | undefined,
  prompt: ReauthPrompt,
  value: string
): { password: string } | { reauth: string } | { googleIdToken: string } {
  if (user?.hasPassword) return { password: value };
  return prompt.kind === "google" ? { googleIdToken: value } : { reauth: value };
}
