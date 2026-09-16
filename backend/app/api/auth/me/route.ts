import { queryOne } from "@/lib/db";
import { ok, notFound, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

// GET /api/auth/me — current user's profile, for resolving a cold-start
// silent refresh into a full user object (refresh itself only returns tokens).
export async function GET(req: Request) {
  try {
    const authUser = await requireUser(req);
    const row = await queryOne<{ id: string; email: string; display_name: string | null; mfa_enabled: boolean }>(
      "select id, email, display_name, mfa_enabled from app_users where id = $1",
      [authUser.id]
    );
    if (!row) return notFound("Account no longer exists.");
    return ok({
      user: { id: row.id, email: row.email, displayName: row.display_name, mfaEnabled: row.mfa_enabled },
    });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
