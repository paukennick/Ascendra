import { NextResponse } from "next/server";

// REQ-205 (Nick, 2026-11-09): the minimum age to create an account is 16.
// Sign-up (email, and the first time someone signs in with Google) must carry
// `ageConfirmed: true`; the server refuses a new account without it and
// records the confirmation on app_users (migration 070). No date of birth is
// asked for or stored. Accounts made before this release were not asked; they
// agree to the Terms, which now state the minimum, in the one combined
// re-accept.
//
// Only the boolean true counts: a string, a number or a missing field does
// not. An installed app from before this release sends nothing, so it cannot
// create an account until it is updated -- an existing account is never
// affected, and a Google sign-in to an existing account does not ask.
export const MINIMUM_AGE = 16;
export const AGE_CONFIRMATION_REQUIRED = "age_confirmation_required";
export const AGE_CONFIRMATION_MESSAGE = `To create an account, confirm that you are ${MINIMUM_AGE} or older. If you don't see the confirmation, update Ascendra to the latest version.`;

export function isAgeConfirmed(body: unknown): boolean {
  return (body as { ageConfirmed?: unknown } | null)?.ageConfirmed === true;
}

// 400 with a code the app recognises: the Google flow uses it to ask for the
// confirmation and try again with the same sign-in.
export function ageConfirmationRequired(): NextResponse {
  return NextResponse.json({ error: AGE_CONFIRMATION_MESSAGE, code: AGE_CONFIRMATION_REQUIRED }, { status: 400 });
}
