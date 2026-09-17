import { query, queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { verifyPassword } from "@/lib/auth/passwords";
import { requestMfaDisableConfirmation, checkMfaDisableConfirmation } from "@/lib/auth/mfa";
import { sendSecurityAlertEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// POST /api/auth/mfa/email/disable — { password, confirmationCode? } — turns
// email-code MFA off. If TOTP is still enabled, the account still requires
// 2FA at login; mfa_enabled only flips off once BOTH methods are off.
// Turning off the LAST remaining method additionally requires an emailed
// confirmation code -- see /api/auth/mfa/disable for the same two-call shape.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { password, confirmationCode } = body ?? {};
    if (!password || typeof password !== "string") {
      return badRequest("password is required");
    }

    const row = await queryOne<{ password_hash: string | null; totp_secret_enc: string | null }>(
      `select password_hash, totp_secret_enc from app_users where id = $1`,
      [user.id]
    );
    if (!row?.password_hash || !(await verifyPassword(password, row.password_hash))) {
      return unauthorized("Incorrect password.");
    }

    const totpStillEnabled = !!row.totp_secret_enc;
    const isLastMethod = !totpStillEnabled;

    if (isLastMethod) {
      if (!confirmationCode || typeof confirmationCode !== "string") {
        await requestMfaDisableConfirmation(user.id, user.email, "email", "email verification codes");
        return ok({ confirmationRequired: true });
      }
      const confirmed = await checkMfaDisableConfirmation(user.id, "email", confirmationCode);
      if (!confirmed) return unauthorized("Incorrect or expired confirmation code.");
    }

    await query(
      `update app_users set email_mfa_enabled = false, email_mfa_pending_code_hash = null,
         email_mfa_pending_expires_at = null, mfa_enabled = $1
       where id = $2`,
      [totpStillEnabled, user.id]
    );
    // Email MFA's own backup codes are always cleared on disable -- scoped
    // to this method now, independent of TOTP's.
    await query(`delete from mfa_backup_codes where user_id = $1 and method = 'email'`, [user.id]);

    await sendSecurityAlertEmail(
      user.email,
      "Two-factor authentication settings changed",
      "Email verification codes were just turned off as a sign-in step on your Ascendra account."
    ).catch(() => undefined);

    return ok({ enabled: false });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
