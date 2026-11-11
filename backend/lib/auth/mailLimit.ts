import { consumeRateLimit, RateLimitError } from "./rateLimit";

// REQ-116 (audit 3, low): reset, verification, registration and email-change
// mails were limited per requesting IP only, so anyone could flood one
// person's inbox from several addresses. Every mail of these kinds now also
// counts against the TARGET address: at most MAIL_TO_LIMIT.max an hour. Over
// the limit the mail is skipped silently -- the route answers exactly as it
// would have, so the limit can't be used to learn which addresses exist.
export const MAIL_TO_EVENT = "mail_to_address";
export const MAIL_TO_LIMIT = { max: 5, windowMinutes: 60 };

export async function mayEmail(address: string): Promise<boolean> {
  return spend(MAIL_TO_EVENT, MAIL_TO_LIMIT, address);
}

// REQ-226 (FAIL-1240): emailed sign-in codes have a budget of their own. They
// shared mayEmail's five an hour with reset and verification mails, and those
// routes answer anyone who knows an address (a password reset needs no
// password), so a stranger could use the hour's budget up and keep the
// learner's sign-in codes from being sent -- and sending sign-in codes ate the
// budget reset links needed. Same storage (auth_events), same per-address
// key, a different event, so the two counts never meet. Unlike mayEmail the
// caller already has the password, so the route says plainly when it is over.
export const MFA_CODE_MAIL_EVENT = "mfa_code_mail_to";
export const MFA_CODE_MAIL_LIMIT = { max: 5, windowMinutes: 60 };

export async function mayEmailSignInCode(address: string): Promise<boolean> {
  return spend(MFA_CODE_MAIL_EVENT, MFA_CODE_MAIL_LIMIT, address);
}

async function spend(event: string, limit: { max: number; windowMinutes: number }, address: string): Promise<boolean> {
  try {
    await consumeRateLimit(event, address.toLowerCase().trim(), limit);
    return true;
  } catch (err) {
    if (err instanceof RateLimitError) return false;
    throw err;
  }
}
