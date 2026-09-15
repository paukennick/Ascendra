import { ok, serverError } from "@/lib/http";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/health — quick DB connectivity check. Does not call Anthropic.
export async function GET() {
  try {
    await query("select 1");
    return ok({ status: "ok" });
  } catch (err) {
    return serverError(err);
  }
}
