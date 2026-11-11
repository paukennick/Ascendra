import { query } from "@/lib/db";
import { ok, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

// GET /api/auth/sessions — list this user's active (non-revoked, unexpired) sessions.
//
// REQ-219 (FAIL-1110): one entry per session (refresh-token FAMILY), not per
// token. A family can hold several live tokens (a rotation replayed by a
// second tab gets its own, REQ-203), which showed up as duplicate devices,
// and signing one of them out left the rest of the session live. `id` is the
// most recently used live token of the family; DELETE /api/auth/sessions/:id
// ends the whole family.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const rows = await query(
      `select id, device_label, user_agent, ip, created_at, last_used_at
         from (select distinct on (coalesce(family_id, id)) id, device_label, user_agent, ip, created_at, last_used_at
                 from refresh_tokens
                where user_id = $1 and revoked_at is null and expires_at > now()
                order by coalesce(family_id, id), last_used_at desc) live
        order by last_used_at desc`,
      [user.id]
    );
    return ok({ sessions: rows });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
