import { query } from "@/lib/db";
import { unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { buildAccountExport } from "@/lib/account-export";

export const dynamic = "force-dynamic";

// GET /api/account/export — every query below is scoped to the caller's own
// user_id, so this can only ever return the requesting user's own data.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);

    const payload = await buildAccountExport(user.id, (sql, params) => query(sql, params));

    return new Response(JSON.stringify(payload, null, 2), {
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
