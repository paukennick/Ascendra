import { withTransaction } from "@/lib/db";
import { badRequest, unauthorized, tooManyRequests, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { buildAccountExport, exportSectionPage, isExportSection } from "@/lib/account-export";

export const dynamic = "force-dynamic";

// GET /api/account/export — every query below is scoped to the caller's own
// user_id, so this can only ever return the requesting user's own data.
//
// REQ-135: bounded and paged (see lib/account-export.ts). Without
// parameters: the first page of every section, plus `more` naming any
// section that has further rows and the offset to ask for.
// ?section=<name>&offset=<n>: the next page of that one section, as
// { section, offset, rows, nextOffset }. Limited to 600 requests (pages) an hour
// (REQ-118: pages are 500 rows now, so a heavy learner needs more of them).
export async function GET(req: Request) {
  try {
    const user = await requireUser(req, { termsOptional: true });
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section");
    const offsetParam = searchParams.get("offset");

    if (section !== null && !isExportSection(section)) return badRequest("Unknown export section");
    const offset = offsetParam === null ? 0 : Number(offsetParam);
    if (!Number.isSafeInteger(offset) || offset < 0) return badRequest("offset must be a whole number of 0 or more");

    try {
      await consumeRateLimit("account_export", user.id, { max: 600, windowMinutes: 60 }, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests("Too many exports just now. Try again later.");
      throw err;
    }

    const payload = await withTransaction(
      (tx) => {
        const run = (sql: string, params: unknown[]) => tx.query<Record<string, unknown>>(sql, params);
        if (section !== null) {
          return exportSectionPage(user.id, section, run, offset).then(({ rows, nextOffset }) => ({ section, offset, rows, nextOffset }));
        }
        return buildAccountExport(user.id, run);
      },
      { readOnlySnapshot: true }
    );

    // REQ-118: compact JSON (pretty-printing added about 25% to the size).
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": "attachment; filename=\"ascendra-data-export.json\"",
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
