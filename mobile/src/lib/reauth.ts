// REQ-116 (audit 3): what the app asks for when the server needs the learner
// to confirm it's them -- changing the email address, or adding an
// authenticator while two-factor is already on (backend lib/auth/reauth.ts).
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
