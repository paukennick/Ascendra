import { query } from "@/lib/db";
import { ok, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { generateEmailCode, hashEmailCode } from "@/lib/auth/mfa";
import { sendMfaEmailCode } from "@/lib/email";
import { checkRateLimit, recordAuthEvent, RateLimitError } from "@/lib/auth/rateLimit";

export const dynamic = "force-dynamic";

const PENDING_TTL_MINUTES = 10;

// POST /api/auth/mfa/email/setup — starts (or restarts) email-code
// enrollment: emails a 6-digit code to the signed-in user's own address and
// stores its hash as "pending". Nothing is committed until that code comes
// back correct via /api/auth/mfa/email/enable — same prove-then-commit shape
// as TOTP's /api/auth/mfa/setup.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);

    try {
      await checkRateLimit("mfa_email_setup_send", user.id, { max: 5, windowMinutes: 10 });
    } catch (err) {
      if (err instanceof RateLimitError) return new Response(JSON.stringify({ error: err.message }), { status: 429 });
      throw err;
    }
    await recordAuthEvent("mfa_email_setup_send", user.id, { userId: user.id });

    const code = generateEmailCode();
    const expiresAt = new Date(Date.now() + PENDING_TTL_MINUTES * 60 * 1000);
    await query(
      `update app_users set email_mfa_pending_code_hash = $1, email_mfa_pending_expires_at = $2 where id = $3`,
      [await hashEmailCode(code), expiresAt, user.id]
    );

    await sendMfaEmailCode(user.email, code);

    return ok({ sent: true, expiresInMinutes: PENDING_TTL_MINUTES });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
