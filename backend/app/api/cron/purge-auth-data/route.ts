import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ok, serverError } from "@/lib/http";
import { purgeExpiredAuthData } from "@/lib/auth/retention";

export const dynamic = "force-dynamic";

// GET /api/cron/purge-auth-data -- REQ-116 (audit 3, finding 5): the daily
// retention purge (lib/auth/retention.ts). Vercel Cron calls it (vercel.json)
// with "Authorization: Bearer $CRON_SECRET" once CRON_SECRET is set in the
// project's environment variables. Without CRON_SECRET it refuses to run
// (503), so it can never be triggered by anyone else.
export async function GET(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
    const header = req.headers.get("authorization") ?? "";
    const given = Buffer.from(header);
    const expected = Buffer.from(`Bearer ${secret}`);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return ok({ purged: await purgeExpiredAuthData() });
  } catch (err) {
    return serverError(err);
  }
}
