import { query, queryOne } from "@/lib/db";
import { ok, unauthorized, tooManyRequests, serverError, readJson } from "@/lib/http";
import { consumeRateLimit, RateLimitError, MFA_DISABLE_EVENT, MFA_DISABLE_LIMIT } from "@/lib/auth/rateLimit";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { mfaDisableGate } from "@/lib/auth/mfaDisableGate";
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
    const body = (await readJson(req)) ?? {};
    try {
      await consumeRateLimit(MFA_DISABLE_EVENT, user.id, MFA_DISABLE_LIMIT, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests("Too many attempts. Try again later.");
      throw err;
    }

    const row = await queryOne<{ totp_secret_enc: string | null }>(`select totp_secret_enc from app_users where id = $1`, [
      user.id,
    ]);
    const totpStillEnabled = !!row?.totp_secret_enc;
    // REQ-116: the proof, including Google-only accounts (lib/auth/mfaDisableGate.ts).
    const gate = await mfaDisableGate(user, body, "email", "email verification codes", !totpStillEnabled);
    if (gate !== "proceed") return gate;

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
