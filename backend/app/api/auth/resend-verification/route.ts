import crypto from "node:crypto";
import { query, queryOne } from "@/lib/db";
import { ok, badRequest, tooManyRequests, serverError, readJson } from "@/lib/http";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { getClientIp } from "@/lib/auth/util";
import { mayEmail } from "@/lib/auth/mailLimit";
import { sendVerificationEmail } from "@/lib/email";
import { logEmailFailure } from "@/lib/email-errors";

export const dynamic = "force-dynamic";

const TOKEN_TTL_HOURS = 24;
const GENERIC_MESSAGE = "If that email is registered and unverified, a new verification link has been sent.";

// POST /api/auth/resend-verification — { email }
// Always returns the same generic response regardless of whether the
// account exists, to avoid leaking which emails are registered.
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const { email } = body ?? {};
    if (!email || typeof email !== "string") {
      return badRequest("email is required");
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail.length > 254) return badRequest("A valid email is required");
    const ip = getClientIp(req);

    try {
      await consumeRateLimit("resend_verification", ip ?? normalizedEmail, { max: 5, windowMinutes: 60 }, { ip });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }

    // REQ-116: once a second registration of this unverified address was
    // seen (set_password links exist), a resent link must stay a
    // set_password link too -- otherwise the first registrant could resend
    // an ordinary one and have the owner's click activate their password.
    const user = await queryOne<{ id: string; email_verified_at: string | null; set_password: boolean }>(
      `select u.id, u.email_verified_at,
              exists(select 1 from email_verification_tokens t where t.user_id = u.id and t.set_password) as set_password
         from app_users u where u.email = $1`,
      [normalizedEmail]
    );
    // REQ-116: also limited per target address; over the limit the mail is
    // skipped and the answer stays the same (lib/auth/mailLimit.ts).
    if (user && !user.email_verified_at && (await mayEmail(normalizedEmail))) {
      const rawToken = crypto.randomBytes(32).toString("base64url");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
      await query(
        `insert into email_verification_tokens (user_id, token_hash, expires_at, set_password) values ($1, $2, $3, $4)`,
        [user.id, tokenHash, expiresAt, user.set_password]
      );
      // REQ-191: logged, answer unchanged (enumeration-safe).
      await sendVerificationEmail(normalizedEmail, rawToken, { setPassword: user.set_password }).catch((err) =>
        logEmailFailure("auth/resend-verification", err)
      );
    }

    return ok({ message: GENERIC_MESSAGE });
  } catch (err) {
    return serverError(err);
  }
}
