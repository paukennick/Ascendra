import { queryOne } from "@/lib/db";
import { ok, unauthorized, tooManyRequests, conflict, serverError, readJson } from "@/lib/http";
import { consumeRateLimit, RateLimitError, MFA_DISABLE_EVENT, MFA_DISABLE_LIMIT } from "@/lib/auth/rateLimit";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { mfaDisableGate } from "@/lib/auth/mfaDisableGate";
import { turnOffMfaMethod, MFA_CHANGED_MESSAGE } from "@/lib/auth/mfaMethodOff";
import { sendSecurityAlertEmail } from "@/lib/email";
import { emailFailureHandler } from "@/lib/email-errors";

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

    // REQ-219 (FAIL-1100): decided and written under a row lock, so two
    // requests turning off the two methods at once can't both skip the
    // last-method confirmation (lib/auth/mfaMethodOff.ts).
    if ((await turnOffMfaMethod(user.id, "email", !totpStillEnabled)) === "changed") return conflict(MFA_CHANGED_MESSAGE);

    await sendSecurityAlertEmail(
      user.email,
      "Two-factor authentication settings changed",
      "Email verification codes were just turned off as a sign-in step on your Ascendra account."
    ).catch(emailFailureHandler("auth/mfa/email/disable"));

    return ok({ enabled: false });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
