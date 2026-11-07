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
  try {
    await consumeRateLimit(MAIL_TO_EVENT, address.toLowerCase().trim(), MAIL_TO_LIMIT);
    return true;
  } catch (err) {
    if (err instanceof RateLimitError) return false;
    throw err;
  }
}
