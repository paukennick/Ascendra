import crypto from "node:crypto";
import { query, queryOne } from "@/lib/db";
import { ok, badRequest, tooManyRequests, serverError } from "@/lib/http";
import { hashPassword } from "@/lib/auth/passwords";
import { checkRateLimit, recordAuthEvent, RateLimitError } from "@/lib/auth/rateLimit";
import { getClientIp } from "@/lib/auth/util";
import { sendVerificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const TOKEN_TTL_HOURS = 24;

// POST /api/auth/register — { email, password, displayName? }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, displayName } = body ?? {};
    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return badRequest("email and password are required");
    }
    if (password.length < 8) {
      return badRequest("password must be at least 8 characters");
    }
    const normalizedEmail = email.toLowerCase().trim();
    const ip = getClientIp(req);

    try {
      await checkRateLimit("register", ip ?? normalizedEmail, { max: 5, windowMinutes: 60 });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }
    await recordAuthEvent("register", ip ?? normalizedEmail, { ip });

    const existing = await queryOne<{ id: string }>("select id from app_users where email = $1", [
      normalizedEmail,
    ]);
    if (existing) {
      return badRequest("An account with that email already exists. Log in instead.");
    }

    const passwordHash = await hashPassword(password);
    const userRow = await queryOne<{ id: string }>(
      `insert into app_users (email, display_name, password_hash) values ($1, $2, $3) returning id`,
      [normalizedEmail, displayName ?? null, passwordHash]
    );
    if (!userRow) throw new Error("Failed to create account.");

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
    await query(
      `insert into email_verification_tokens (user_id, token_hash, expires_at) values ($1, $2, $3)`,
      [userRow.id, tokenHash, expiresAt]
    );
    await sendVerificationEmail(normalizedEmail, rawToken);

    return ok({ message: "Account created. Check your email to verify it before logging in." }, 201);
  } catch (err) {
    return serverError(err);
  }
}
