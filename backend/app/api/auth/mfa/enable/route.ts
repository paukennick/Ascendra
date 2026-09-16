import { query, queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { verifyTotpCode, generateBackupCodes } from "@/lib/auth/mfa";
import { encrypt, decrypt } from "@/lib/auth/crypto";

export const dynamic = "force-dynamic";

// POST /api/auth/mfa/enable — { code } — proves the user's authenticator app
// actually has the secret from /api/auth/mfa/setup by requiring one valid
// code from it, then activates MFA and issues one-time backup codes (shown
// exactly once in this response -- only their hashes are ever stored).
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { code } = body ?? {};
    if (!code || typeof code !== "string") {
      return badRequest("code is required");
    }

    const row = await queryOne<{ totp_pending_secret_enc: string | null; totp_pending_expires_at: string | null }>(
      `select totp_pending_secret_enc, totp_pending_expires_at from app_users where id = $1`,
      [user.id]
    );
    if (!row?.totp_pending_secret_enc || !row.totp_pending_expires_at) {
      return badRequest("No pending MFA setup found. Call /api/auth/mfa/setup first.");
    }
    if (new Date(row.totp_pending_expires_at).getTime() < Date.now()) {
      return badRequest("MFA setup expired. Call /api/auth/mfa/setup again to get a new QR code.");
    }

    const pendingSecret = decrypt(row.totp_pending_secret_enc);
    const valid = await verifyTotpCode(pendingSecret, code);
    if (!valid) {
      return unauthorized("Incorrect code. Check your authenticator app and try again.");
    }

    const { raw: backupCodes, hashed } = await generateBackupCodes();

    await query(
      `update app_users set mfa_enabled = true, totp_secret_enc = $1,
         totp_pending_secret_enc = null, totp_pending_expires_at = null
       where id = $2`,
      [encrypt(pendingSecret), user.id]
    );
    // Enabling replaces any previous backup codes -- old ones from a prior
    // enrollment shouldn't keep working against a new secret.
    await query(`delete from mfa_backup_codes where user_id = $1`, [user.id]);
    await query(
      `insert into mfa_backup_codes (user_id, code_hash) select $1, unnest($2::text[])`,
      [user.id, hashed]
    );

    return ok({ enabled: true, backupCodes });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
