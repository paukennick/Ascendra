import { ok, serverError } from "@/lib/http";
import { query } from "@/lib/db";
import { checkSchema, migrationsToApply } from "@/lib/schema-status";

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
export async function GET() {
  try {
    await query("select 1");
    const schema = await checkSchema((sql) => query<{ ok: boolean }>(sql));
    if (!schema.current) {
      return ok(
        { status: "schema_incomplete", applyMigrations: migrationsToApply(schema), missing: schema.missing },
        503
      );
    }
    return ok({ status: "ok", schema: "current" });
  } catch (err) {
    return serverError(err);
  }
}
