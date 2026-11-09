import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

// The check every /api/cron/* route makes (REQ-116, moved here by REQ-143 so
// each new cron route uses the same one). Vercel Cron sends
// "Authorization: Bearer $CRON_SECRET". Returns the response to send when the
// caller is not allowed, or null when it is. Without CRON_SECRET the route
// refuses to run (503), so nobody else can trigger it.
export function cronAuthFailure(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
