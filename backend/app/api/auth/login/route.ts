import { query, queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { verifyPassword } from "@/lib/auth/passwords";
import { recordAuthEvent } from "@/lib/auth/rateLimit";
import { getClientIp, getUserAgent } from "@/lib/auth/util";
import { createLoginChallenge } from "@/lib/auth/mfaChallenge";
import { completeLogin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  password_hash: string | null;
  email_verified_at: string | null;
  failed_login_count: number;
  locked_until: string | null;
  mfa_enabled: boolean;
}

// POST /api/auth/login — { email, password, deviceLabel? }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, deviceLabel } = body ?? {};
    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return badRequest("email and password are required");
    }
    const normalizedEmail = email.toLowerCase().trim();
    const ip = getClientIp(req);
    const userAgent = getUserAgent(req);

    const user = await queryOne<UserRow>(
      `select id, email, display_name, password_hash, email_verified_at, failed_login_count, locked_until, mfa_enabled
       from app_users where email = $1`,
      [normalizedEmail]
    );

    if (!user || !user.password_hash) {
      await recordAuthEvent("login_fail", normalizedEmail, { ip });
      return unauthorized("Invalid email or password.");
    }

    if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      return new Response(
        JSON.stringify({
          error: "Account temporarily locked due to repeated failed login attempts. Try again later.",
        }),
        { status: 423, headers: { "Content-Type": "application/json" } }
      );
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      const newCount = user.failed_login_count + 1;
      const lockedUntil = newCount >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null;
      await query(`update app_users set failed_login_count = $1, locked_until = $2 where id = $3`, [
        newCount,
        lockedUntil,
        user.id,
      ]);
      await recordAuthEvent("login_fail", normalizedEmail, { ip, userId: user.id });
      return unauthorized("Invalid email or password.");
    }

    if (!user.email_verified_at) {
      return new Response(
        JSON.stringify({
          error: "Please verify your email before logging in.",
          emailVerificationRequired: true,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const meta = { deviceLabel: typeof deviceLabel === "string" ? deviceLabel : null, userAgent, ip };

    if (user.mfa_enabled) {
      await recordAuthEvent("login_mfa_challenge", normalizedEmail, { ip, userId: user.id });
      const challengeToken = await createLoginChallenge(user.id, meta);
      return ok({ mfaRequired: true, challengeToken });
    }

    await recordAuthEvent("login_success", normalizedEmail, { ip, userId: user.id });
    const session = await completeLogin(user, meta);
    return ok(session);
  } catch (err) {
    return serverError(err);
  }
}
