import { ok, serverError } from "@/lib/http";
import { cronAuthFailure } from "@/lib/cron-auth";
import { runServiceEmails, serviceEmailsEnabled } from "@/lib/service-emails";

export const dynamic = "force-dynamic";
// Small batches with a pause between sends (lib/service-emails.ts).
export const maxDuration = 120;

// GET /api/cron/service-emails -- REQ-197: the daily pass that sends the
// exam change notices, the 14- and 3-day exam countdown and (when
// MAIL_POSTAL_ADDRESS and DIGEST_EMAIL_FROM are set) the opt-in weekly
// digest. Vercel Cron calls it (vercel.json) with CRON_SECRET. Each learner,
// kind and period is sent at most once (service_email_log); a run that hits
// its batch size leaves the rest for the next day.
//
// Off until SERVICE_EMAILS_ENABLED=true: the Privacy Policy still describes
// account email only (mobile/src/content/legal.ts, "To send account email"),
// so the cron ships dark and is switched on with that policy update.
export async function GET(req: Request) {
  try {
    const denied = cronAuthFailure(req);
    if (denied) return denied;
    if (!serviceEmailsEnabled()) return ok({ skipped: "SERVICE_EMAILS_ENABLED is not true" });
    return ok(await runServiceEmails());
  } catch (err) {
    return serverError(err);
  }
}
