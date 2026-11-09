import { sendSecurityAlertEmail } from "@/lib/email";

// Grants and revokes together, per owner (the security rate limits stay on
// for owners too).
export const GRANT_LIMIT = { max: 30, windowMinutes: 60 };

// REQ-144: every access change made in the app is emailed to the owner who
// made it, so one made with a stolen session is noticed. Never fails the
// change itself.
export async function notifyOwnerOfChange(ownerEmail: string, message: string): Promise<void> {
  try {
    await sendSecurityAlertEmail(ownerEmail, "Ascendra: unrestricted access changed", message);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[access] owner notice not sent:", (err as Error)?.message);
  }
}
