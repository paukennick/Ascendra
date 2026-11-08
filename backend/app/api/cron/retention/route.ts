// GET /api/cron/retention -- line B's (REQ-093) path for the daily retention
// purge. Since the 2026-11-07 merge there is one purge (lib/retention.ts)
// and one handler, line A's /api/cron/purge-auth-data (constant-time
// CRON_SECRET check, 503 when CRON_SECRET is unset); vercel.json schedules
// that path. This one answers identically so a cron or a runbook pointing
// here keeps working.
export const dynamic = "force-dynamic";
export { GET } from "../purge-auth-data/route";
