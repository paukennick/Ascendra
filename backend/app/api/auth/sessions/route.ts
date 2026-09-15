import { query } from "@/lib/db";
import { ok, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

// GET /api/auth/sessions — list this user's active (non-revoked, unexpired) sessions.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const rows = await query(
      `select id, device_label, user_agent, ip, created_at, last_used_at
       from refresh_tokens
       where user_id = $1 and revoked_at is null and expires_at > now()
       order by last_used_at desc`,
      [user.id]
    );
    return ok({ sessions: rows });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
