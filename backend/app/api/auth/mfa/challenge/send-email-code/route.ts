import crypto from "node:crypto";
import { queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, tooManyRequests, serverError, readJson } from "@/lib/http";
import { getLoginChallenge, setChallengeEmailCode, ChallengeError } from "@/lib/auth/mfaChallenge";
import { generateEmailCode, hashEmailCode } from "@/lib/auth/mfa";
import { sendMfaEmailCode } from "@/lib/email";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { mayEmail } from "@/lib/auth/mailLimit";

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
    const body = await readJson(req);
    const { challengeToken } = body ?? {};
    if (!challengeToken || typeof challengeToken !== "string") {
      return badRequest("challengeToken is required");
    }

    // Rate limit per challenge, not per account -- bounds how many emails a
    // single login attempt can trigger, same reasoning as mfa_verify_attempt.
    const challengeKey = crypto.createHash("sha256").update(challengeToken).digest("hex");
    try {
      await consumeRateLimit("mfa_email_code_send", challengeKey, { max: 3, windowMinutes: 10 });
    } catch (err) {
      if (err instanceof RateLimitError) return new Response(JSON.stringify({ error: err.message }), { status: 429 });
      throw err;
    }

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

    // REQ-219 (FAIL-1114): every other mail to an address counts against the
    // per-address hourly limit (lib/auth/mailLimit.ts); this one only had the
    // per-challenge cap, and each new sign-in starts a new challenge. Here the
    // caller already has the password, so the limit can say so plainly (a 429
    // the app shows) instead of skipping silently.
    if (!(await mayEmail(user.email))) {
      return tooManyRequests(
        "We've sent several codes to this address in the last hour. Wait a while, or use your authenticator app or a backup code."
      );
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
