// REQ-205 (Nick, 2026-11-09): creating an account needs a neutral "I am 16 or
// older" confirmation. No date of birth is asked for. The server enforces it
// (backend/lib/age-confirmation.ts) and answers a missing confirmation with
// 400 { code: "age_confirmation_required" }; this is the app's half. Pure, so
// it can be tested without the screens.

export const MINIMUM_AGE = 16;
export const AGE_CONFIRMATION_LABEL = `I am ${MINIMUM_AGE} or older`;
export const AGE_CONFIRMATION_CODE = "age_confirmation_required";
export const AGE_CONFIRMATION_ERROR = `Confirm that you are ${MINIMUM_AGE} or older to create an account.`;

// The error to show when the box is not ticked, or null when it is.
export function ageCheckError(confirmed: boolean): string | null {
  return confirmed ? null : AGE_CONFIRMATION_ERROR;
}

// The part of a sign-up request body that carries the confirmation. Only a
// ticked box sends it; the server counts nothing but the boolean true.
export function ageField(confirmed: boolean): { ageConfirmed?: true } {
  return confirmed ? { ageConfirmed: true } : {};
}

// True when the server refused a first-time Google sign-in only because the
// age was not confirmed yet, so the app can ask and retry with the same
// sign-in. `err` is an ApiError (status, data) or anything else.
export function isAgeConfirmationRequired(err: unknown): boolean {
  const e = err as { status?: unknown; data?: { code?: unknown } | null } | null;
  return e?.status === 400 && e?.data?.code === AGE_CONFIRMATION_CODE;
}
