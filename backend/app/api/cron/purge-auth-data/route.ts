import { ok, serverError } from "@/lib/http";
import { purgeExpiredAuthData } from "@/lib/auth/retention";
import { cronAuthFailure } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

// GET /api/cron/purge-auth-data -- REQ-116 (audit 3, finding 5): the daily
// retention purge (lib/auth/retention.ts). Vercel Cron calls it (vercel.json)
// with "Authorization: Bearer $CRON_SECRET" once CRON_SECRET is set in the
// project's environment variables. Without CRON_SECRET it refuses to run
// (503), so it can never be triggered by anyone else (lib/cron-auth.ts).
export async function GET(req: Request) {
  try {
    const denied = cronAuthFailure(req);
    if (denied) return denied;
    return ok({ purged: await purgeExpiredAuthData() });
  } catch (err) {
    return serverError(err);
  }
}
