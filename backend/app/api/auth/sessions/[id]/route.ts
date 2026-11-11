import { query, queryOne } from "@/lib/db";
import { revokeRefreshFamily } from "@/lib/auth/tokens";
import { ok, notFound, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

// DELETE /api/auth/sessions/:id — end one of this user's sessions.
// REQ-219 (FAIL-1110): this revoked the one token row named, so a session
// holding another live token of its family (a rotation replayed by a second
// tab) stayed signed in. It ends every live token of the row's family. The
// device's current access token still works until it expires (15 minutes);
// signing out of everywhere (logout-all) ends those at once.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    const row = await queryOne<{ id: string; family_id: string | null }>(
      `select id, family_id from refresh_tokens where id = $1 and user_id = $2 and revoked_at is null`,
      [id, user.id]
    );
    if (!row) return notFound("Session not found");
    // A token from before families existed (null) is its own session.
    if (row.family_id) await revokeRefreshFamily(user.id, row.family_id);
    else await query(`update refresh_tokens set revoked_at = now() where id = $1`, [id]);
    return ok({ success: true });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
