import { query, queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { verifyTotpCode, generateBackupCodes } from "@/lib/auth/mfa";
import { encrypt, decrypt } from "@/lib/auth/crypto";
import { endOtherSessions } from "@/lib/auth/sessionControl";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/auth/mfa/enable — { code } — proves the user's authenticator app
// actually has the secret from /api/auth/mfa/setup by requiring one valid
// code from it, then activates TOTP and issues its own set of one-time
// backup codes (shown exactly once in this response -- only their hashes
// are ever stored). These are TOTP-scoped -- email-code MFA (see
// /api/auth/mfa/email/enable) has its own independent set.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    const { code } = body ?? {};
    if (!code || typeof code !== "string") {
      return badRequest("code is required");
    }

    const row = await queryOne<{
      totp_pending_secret_enc: string | null;
      totp_pending_expires_at: string | null;
      totp_pending_reauth_at: string | null;
      mfa_enabled: boolean;
    }>(
      `select totp_pending_secret_enc, totp_pending_expires_at, totp_pending_reauth_at, mfa_enabled
         from app_users where id = $1`,
      [user.id]
    );
    if (!row?.totp_pending_secret_enc || !row.totp_pending_expires_at) {
      return badRequest("No pending MFA setup found. Call /api/auth/mfa/setup first.");
    }
    if (new Date(row.totp_pending_expires_at).getTime() < Date.now()) {
      return badRequest("MFA setup expired. Call /api/auth/mfa/setup again to get a new QR code.");
    }

    // REQ-116: with MFA already on, only a secret whose setup confirmed it
    // was the owner can be enabled (see /api/auth/mfa/setup).
    if (row.mfa_enabled && !row.totp_pending_reauth_at) {
      return NextResponse.json(
        {
          error: "Two-factor is already on, so confirm it's you first. Start the authenticator setup again.",
          reauthRequired: true,
        },
        { status: 401 }
      );
    }

    const pendingSecret = decrypt(row.totp_pending_secret_enc);
    const valid = await verifyTotpCode(pendingSecret, code);
    if (!valid) {
      return unauthorized("Incorrect code. Check your authenticator app and try again.");
    }

    const { raw: backupCodes, hashed } = await generateBackupCodes();

    await query(
      `update app_users set mfa_enabled = true, totp_secret_enc = $1,
         totp_pending_secret_enc = null, totp_pending_expires_at = null, totp_pending_reauth_at = null
       where id = $2`,
      [encrypt(pendingSecret), user.id]
    );
    // Enabling replaces any previous TOTP backup codes -- old ones from a
    // prior enrollment shouldn't keep working against a new secret. Only
    // this method's codes are touched; email-code MFA's own codes (if any)
    // are untouched.
    await query(`delete from mfa_backup_codes where user_id = $1 and method = 'totp'`, [user.id]);
    await query(
      `insert into mfa_backup_codes (user_id, method, code_hash) select $1, 'totp', unnest($2::text[])`,
      [user.id, hashed]
    );

    // REQ-116: turning on a sign-in method signs out every other device
    // (someone who had a session before must now pass the new step) and
    // ends their access tokens; this device gets a fresh access token.
    const accessToken = await endOtherSessions(user);

    return ok({ enabled: true, backupCodes, ...(accessToken ? { accessToken } : {}) });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
