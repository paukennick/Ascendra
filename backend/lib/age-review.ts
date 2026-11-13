import { sendUnderMinimumAgeNotice } from "@/lib/email";
import { ownerEmails } from "@/lib/account-access-config";
import { MINIMUM_AGE } from "@/lib/age-confirmation";

// REQ-259 (Nick, 2026-11-13): a date of birth entered at an 18+ prompt that
// makes the account younger than the account minimum (MINIMUM_AGE, 16) is
// reported to every owner (OWNER_EMAILS, the same list the AI-ceiling notice
// uses, lib/account-access.ts) for review. Only the account id and address
// and the fact go out, never the date of birth or the age, and the log line
// says the same. Nothing is deleted or changed automatically.
//
// Sent once: the caller runs it only in the request that stored the date of
// birth, which can be written only once. Never throws: the learner gets the
// same locked-course answer whether or not the mail went out. A failed or
// unconfigured send is logged with the account id so it can be found.
export async function notifyOwnersUnderMinimumAge(
  userId: string,
  email: string,
  env: Record<string, string | undefined> = process.env
): Promise<void> {
  const owners = [...ownerEmails(env)];
  // eslint-disable-next-line no-console
  console.warn(`[age-review] account ${userId} entered a date of birth below the account minimum age (${MINIMUM_AGE}); owners to review`);
  if (!owners.length) {
    // eslint-disable-next-line no-console
    console.error(`[age-review] no owner address is set (OWNER_EMAILS), so no notice was sent for account ${userId}`);
    return;
  }
  for (const to of owners) {
    try {
      await sendUnderMinimumAgeNotice(to, userId, email, MINIMUM_AGE);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[age-review] owner notice not sent for account ${userId}:`, (err as Error)?.message);
    }
  }
}
