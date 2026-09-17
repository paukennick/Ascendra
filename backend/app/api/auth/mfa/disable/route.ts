import { query, queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { verifyPassword } from "@/lib/auth/passwords";
import { requestMfaDisableConfirmation, checkMfaDisableConfirmation } from "@/lib/auth/mfa";
import { sendSecurityAlertEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// POST /api/auth/mfa/disable — { password, confirmationCode? } — turns TOTP
// off. Requires the account password again even though the caller already
// holds a valid access token, so a briefly-unlocked/stolen device session
// alone can't turn off MFA. If email-code MFA is still enabled, the account
// still requires 2FA at login; mfa_enabled only flips off once BOTH methods
// are off. Turning off the LAST remaining method additionally requires an
// emailed confirmation code: the first call (password only) sends that code
// and returns { confirmationRequired: true } instead of disabling anything;
// the caller then resubmits with confirmationCode to actually complete it.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { password, confirmationCode } = body ?? {};
    if (!password || typeof password !== "string") {
      return badRequest("password is required");
    }

    const row = await queryOne<{ password_hash: string | null; email_mfa_enabled: boolean }>(
      `select password_hash, email_mfa_enabled from app_users where id = $1`,
      [user.id]
    );
    if (!row?.password_hash || !(await verifyPassword(password, row.password_hash))) {
      return unauthorized("Incorrect password.");
    }

    const emailStillEnabled = row.email_mfa_enabled;
    const isLastMethod = !emailStillEnabled;

    if (isLastMethod) {
      if (!confirmationCode || typeof confirmationCode !== "string") {
        await requestMfaDisableConfirmation(user.id, user.email, "totp", "authenticator app codes");
        return ok({ confirmationRequired: true });
      }
      const confirmed = await checkMfaDisableConfirmation(user.id, "totp", confirmationCode);
      if (!confirmed) return unauthorized("Incorrect or expired confirmation code.");
    }

    await query(
      `update app_users set mfa_enabled = $1, totp_secret_enc = null,
         totp_pending_secret_enc = null, totp_pending_expires_at = null
       where id = $2`,
      [emailStillEnabled, user.id]
    );
    // TOTP's own backup codes are always cleared on disable -- they're
    // scoped to this method now, independent of whatever email MFA's codes
    // are doing.
    await query(`delete from mfa_backup_codes where user_id = $1 and method = 'totp'`, [user.id]);

    await sendSecurityAlertEmail(
      user.email,
      "Two-factor authentication settings changed",
      "Authenticator app codes were just turned off as a sign-in step on your Ascendra account."
    ).catch(() => undefined);

    return ok({ enabled: false });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
