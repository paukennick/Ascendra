import { query, queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { verifyPassword } from "@/lib/auth/passwords";

export const dynamic = "force-dynamic";

// POST /api/auth/mfa/disable — { password } — requires the account password
// again even though the caller already holds a valid access token, so a
// briefly-unlocked/stolen device session alone can't turn off MFA.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { password } = body ?? {};
    if (!password || typeof password !== "string") {
      return badRequest("password is required");
    }

    const row = await queryOne<{ password_hash: string | null }>(
      `select password_hash from app_users where id = $1`,
      [user.id]
    );
    if (!row?.password_hash || !(await verifyPassword(password, row.password_hash))) {
      return unauthorized("Incorrect password.");
    }

    await query(
      `update app_users set mfa_enabled = false, totp_secret_enc = null,
         totp_pending_secret_enc = null, totp_pending_expires_at = null
       where id = $1`,
      [user.id]
    );
    await query(`delete from mfa_backup_codes where user_id = $1`, [user.id]);

    return ok({ enabled: false });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
