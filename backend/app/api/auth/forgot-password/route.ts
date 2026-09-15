import crypto from "node:crypto";
import { query, queryOne } from "@/lib/db";
import { ok, badRequest, tooManyRequests, serverError } from "@/lib/http";
import { checkRateLimit, recordAuthEvent, RateLimitError } from "@/lib/auth/rateLimit";
import { getClientIp } from "@/lib/auth/util";
import { sendPasswordResetEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const TOKEN_TTL_HOURS = 1;
const GENERIC_MESSAGE = "If that email is registered, a password reset link has been sent.";

// POST /api/auth/forgot-password — { email }
// Always returns the same generic response regardless of whether the
// account exists, to avoid leaking which emails are registered.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body ?? {};
    if (!email || typeof email !== "string") {
      return badRequest("email is required");
    }
    const normalizedEmail = email.toLowerCase().trim();
    const ip = getClientIp(req);

    try {
      await checkRateLimit("password_reset_request", ip ?? normalizedEmail, { max: 5, windowMinutes: 60 });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }
    await recordAuthEvent("password_reset_request", ip ?? normalizedEmail, { ip });

    const user = await queryOne<{ id: string }>("select id from app_users where email = $1", [normalizedEmail]);
    if (user) {
      const rawToken = crypto.randomBytes(32).toString("base64url");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
      await query(
        `insert into password_reset_tokens (user_id, token_hash, expires_at, requested_ip) values ($1, $2, $3, $4)`,
        [user.id, tokenHash, expiresAt, ip]
      );
      await sendPasswordResetEmail(normalizedEmail, rawToken);
    }

    return ok({ message: GENERIC_MESSAGE });
  } catch (err) {
    return serverError(err);
  }
}
