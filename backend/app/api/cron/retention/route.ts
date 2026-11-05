import { ok, unauthorized, serverError } from "@/lib/http";
import { purgeExpired } from "@/lib/retention";

export const dynamic = "force-dynamic";

// GET /api/cron/retention -- REQ-093: daily deletion of expired sign-in logs,
// ended sessions and used tokens (periods in lib/retention.ts). Vercel Cron
// calls this with "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is
// set on the project; anything else is refused so the route cannot be used
// to hammer the database.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return unauthorized("Not allowed");
  }
  try {
    const deleted = await purgeExpired();
    return ok({ deleted });
  } catch (err) {
    return serverError(err);
  }
}
