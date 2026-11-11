import { ok, serverError } from "@/lib/http";
import { query } from "@/lib/db";
import { expectedMigrations, healthCache } from "@/lib/health";
import { emailSenderStatus } from "@/lib/email-errors";
import { hasCronToken } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

// GET /api/health -- DB connectivity, a schema check and a migration-ledger
// check. Does not call Anthropic.
//
// REQ-128: confirms the database has the schema this deploy needs
// (lib/schema-status.ts) and answers 503 if not. The daily keepalive workflow
// treats anything but 200 as a failure, so code deployed ahead of its
// migration shows up as a red workflow run instead of silent 500s.
//
// REQ-135: the result is cached for 30 seconds (lib/health.ts) so this
// unauthenticated route can't be used to load the database, and a connection
// failure answers a generic 500 (lib/http.ts).
//
// REQ-207 (FAIL-949):
// - It also checks that the schema_migrations ledger lists every migration
//   file this build ships, and reports the deployed commit.
// - The PUBLIC answer carries only a status word and the short commit. It no
//   longer names missing environment variables, migration filenames or
//   warnings (it did: anyone could read which secrets a deploy lacked and
//   which migrations production had not run). The owner's view -- the same
//   details as before -- needs `Authorization: Bearer $CRON_SECRET`, which
//   Vercel Cron sends itself and `curl -H` can send by hand.
// - Production without a real EMAIL_FROM (unset or on resend.dev) is a 503
//   "misconfigured", no longer a warning on a 200 (REQ-191).
export async function GET(req: Request) {
  const detail = hasCronToken(req);
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || null;
  const commit = sha ? (detail ? sha : sha.slice(0, 7)) : null;
  const result = await healthCache.get((sql) => query<{ ok: boolean }>(sql), undefined, {
    expected: expectedMigrations(),
    recorded: async () => (await query<{ filename: string }>(`select filename from schema_migrations`)).map((r) => r.filename),
  });
  if (result.kind === "error") return serverError(result.error);
  if (result.kind === "schema_incomplete") {
    return ok(
      detail
        ? { status: "schema_incomplete", commit, applyMigrations: result.applyMigrations, missing: result.missing }
        : { status: "schema_incomplete", commit },
      503
    );
  }
  if (result.kind === "ledger_incomplete") {
    return ok(detail ? { status: "ledger_incomplete", commit, unrecorded: result.unrecorded } : { status: "ledger_incomplete", commit }, 503);
  }
  // A deploy missing a required setting fails here instead of on a learner's
  // first sign-in or grade (REQ-118).
  if (result.kind === "misconfigured") {
    return ok(detail ? { status: "misconfigured", commit, env: result.env } : { status: "misconfigured", commit }, 503);
  }
  const warnings = result.warnings ?? [];
  return ok(
    detail
      ? { status: "ok", schema: "current", commit, email: emailSenderStatus(process.env), ...(warnings.length ? { warnings } : {}) }
      : { status: "ok", schema: "current", commit }
  );
}
