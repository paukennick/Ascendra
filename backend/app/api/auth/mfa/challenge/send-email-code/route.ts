import crypto from "node:crypto";
import { queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { getLoginChallenge, setChallengeEmailCode, ChallengeError } from "@/lib/auth/mfaChallenge";
import { generateEmailCode, hashEmailCode } from "@/lib/auth/mfa";
import { sendMfaEmailCode } from "@/lib/email";
import { checkRateLimit, recordAuthEvent, RateLimitError } from "@/lib/auth/rateLimit";

export const dynamic = "force-dynamic";

const EMAIL_CODE_TTL_MINUTES = 10;

// POST /api/auth/mfa/challenge/send-email-code — { challengeToken } — the
// login-time counterpart to /api/auth/mfa/email/setup: emails a fresh
// 6-digit code for an in-progress login_challenges row (created by
// /api/auth/login once the password checked out) whose account has
// email-code MFA enabled. /api/auth/mfa/verify accepts that code the same
// way it accepts a TOTP or backup code.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { challengeToken } = body ?? {};
    if (!challengeToken || typeof challengeToken !== "string") {
      return badRequest("challengeToken is required");
    }

    // Rate limit per challenge, not per account -- bounds how many emails a
    // single login attempt can trigger, same reasoning as mfa_verify_attempt.
    const challengeKey = crypto.createHash("sha256").update(challengeToken).digest("hex");
    try {
      await checkRateLimit("mfa_email_code_send", challengeKey, { max: 3, windowMinutes: 10 });
    } catch (err) {
      if (err instanceof RateLimitError) return new Response(JSON.stringify({ error: err.message }), { status: 429 });
      throw err;
    }
    await recordAuthEvent("mfa_email_code_send", challengeKey);

    let challenge;
    try {
      challenge = await getLoginChallenge(challengeToken);
    } catch (err) {
      if (err instanceof ChallengeError) return unauthorized(err.message);
      throw err;
    }

    const user = await queryOne<{ email: string; email_mfa_enabled: boolean }>(
      `select email, email_mfa_enabled from app_users where id = $1`,
      [challenge.userId]
    );
    if (!user?.email_mfa_enabled) {
      return badRequest("Email verification codes are not enabled for this account.");
    }

    const code = generateEmailCode();
    const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000);
    await setChallengeEmailCode(challenge.id, await hashEmailCode(code), expiresAt);
    await sendMfaEmailCode(user.email, code);

    return ok({ sent: true, expiresInMinutes: EMAIL_CODE_TTL_MINUTES });
  } catch (err) {
    return serverError(err);
  }
}
