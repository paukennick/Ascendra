import { query, queryOne } from "@/lib/db";
import { ok, notFound, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

// DELETE /api/auth/sessions/:id — revoke one of this user's sessions.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    const row = await queryOne<{ id: string }>(
      `select id from refresh_tokens where id = $1 and user_id = $2 and revoked_at is null`,
      [id, user.id]
    );
    if (!row) return notFound("Session not found");
    await query(`update refresh_tokens set revoked_at = now() where id = $1`, [id]);
    return ok({ success: true });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
