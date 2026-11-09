import { ok, serverError } from "@/lib/http";
import { cronAuthFailure } from "@/lib/cron-auth";
import { runContentSignals } from "@/lib/content-review-queue";

export const dynamic = "force-dynamic";

// GET /api/cron/content-signals -- REQ-143: the daily pass that opens
// content review queue entries from learner signals (rising reports, a sharp
// drop in an item's correct rate). Records only; never pulls content.
// Vercel Cron calls it (vercel.json) with CRON_SECRET, like the purge.
// A person reads the queue with `npm run review-queue`.
export async function GET(req: Request) {
  try {
    const denied = cronAuthFailure(req);
    if (denied) return denied;
    const r = await runContentSignals();
    return ok({ skipped: r.skipped, checked: r.checked, opened: r.opened, refreshed: r.refreshed });
  } catch (err) {
    return serverError(err);
  }
}
