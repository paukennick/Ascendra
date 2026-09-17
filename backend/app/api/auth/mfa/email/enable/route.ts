import { query, queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { verifyEmailCode, generateBackupCodes } from "@/lib/auth/mfa";

export const dynamic = "force-dynamic";

// POST /api/auth/mfa/email/enable — { code } — proves the code from
// /api/auth/mfa/email/setup actually reached the user's inbox, then turns
// email-code MFA on and issues its own set of backup codes, independent of
// TOTP's (see /api/auth/mfa/enable).
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { code } = body ?? {};
    if (!code || typeof code !== "string") {
      return badRequest("code is required");
    }

    const row = await queryOne<{
      email_mfa_pending_code_hash: string | null;
      email_mfa_pending_expires_at: string | null;
    }>(`select email_mfa_pending_code_hash, email_mfa_pending_expires_at from app_users where id = $1`, [user.id]);
    if (!row?.email_mfa_pending_code_hash || !row.email_mfa_pending_expires_at) {
      return badRequest("No pending email code found. Call /api/auth/mfa/email/setup first.");
    }
    if (new Date(row.email_mfa_pending_expires_at).getTime() < Date.now()) {
      return badRequest("Code expired. Call /api/auth/mfa/email/setup again to get a new one.");
    }

    const valid = await verifyEmailCode(code, row.email_mfa_pending_code_hash);
    if (!valid) {
      return unauthorized("Incorrect code.");
    }

    await query(
      `update app_users set mfa_enabled = true, email_mfa_enabled = true,
         email_mfa_pending_code_hash = null, email_mfa_pending_expires_at = null
       where id = $1`,
      [user.id]
    );

    const { raw: backupCodes, hashed } = await generateBackupCodes();
    await query(`delete from mfa_backup_codes where user_id = $1 and method = 'email'`, [user.id]);
    await query(`insert into mfa_backup_codes (user_id, method, code_hash) select $1, 'email', unnest($2::text[])`, [
      user.id,
      hashed,
    ]);

    return ok({ enabled: true, backupCodes });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
