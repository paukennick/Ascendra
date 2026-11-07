import { ok, serverError } from "@/lib/http";
import { query } from "@/lib/db";
import { healthCache } from "@/lib/health";

export const dynamic = "force-dynamic";

// GET /api/health — DB connectivity plus a schema check. Does not call
// Anthropic.
//
// REQ-090: also confirms the database has the schema this deploy needs
// (lib/schema-status.ts) and answers 503 naming the migrations to apply if
// not. The daily keepalive workflow treats anything but 200 as a failure,
// so code deployed ahead of its migration shows up as a red workflow run
// instead of silent 500s on the course list or on grading. Only migration
// filenames are exposed -- no data.
//
// REQ-098: the result is cached for 30 seconds (lib/health.ts) so this
// unauthenticated route can't be used to load the database, and a
// connection failure answers a generic 500 (lib/http.ts) instead of the
// driver's message, which can name the database host or user.
export async function GET() {
  const result = await healthCache.get((sql) => query<{ ok: boolean }>(sql));
  if (result.kind === "error") return serverError(result.error);
  if (result.kind === "schema_incomplete") {
    return ok(
      { status: "schema_incomplete", applyMigrations: result.applyMigrations, missing: result.missing },
      503
    );
  }
  return ok({ status: "ok", schema: "current" });
}
