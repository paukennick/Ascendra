import { queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { verifyPassword } from "@/lib/auth/passwords";
import { recordAuthEvent } from "@/lib/auth/rateLimit";
import { getClientIp, getUserAgent } from "@/lib/auth/util";
import { createLoginChallenge } from "@/lib/auth/mfaChallenge";
import { completeLogin } from "@/lib/auth/session";
import { reserveLoginAttempt, clearLoginFailures } from "@/lib/auth/lockout";

export const dynamic = "force-dynamic";

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  password_hash: string | null;
  email_verified_at: string | null;
  mfa_enabled: boolean;
  totp_secret_enc: string | null;
  email_mfa_enabled: boolean;
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
      `select id, email, display_name, password_hash, email_verified_at,
              mfa_enabled, totp_secret_enc, email_mfa_enabled
       from app_users where email = $1`,
      [normalizedEmail]
    );

    if (!user || !user.password_hash) {
      await recordAuthEvent("login_fail", normalizedEmail, { ip });
      return unauthorized("Invalid email or password.");
    }

    // REQ-098: reserve this password check before running it (one guarded
    // UPDATE, see lib/auth/lockout.ts). Parallel guesses used to all read
    // the same failed_login_count and write back 1, so the lockout never hit.
    if (!(await reserveLoginAttempt(user.id))) {
      return new Response(
        JSON.stringify({
          error: "Account temporarily locked due to repeated failed login attempts. Try again later.",
        }),
        { status: 423, headers: { "Content-Type": "application/json" } }
      );
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      await recordAuthEvent("login_fail", normalizedEmail, { ip, userId: user.id });
      return unauthorized("Invalid email or password.");
    }
    await clearLoginFailures(user.id);

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
      return ok({
        mfaRequired: true,
        challengeToken,
        mfaMethods: { totp: !!user.totp_secret_enc, email: user.email_mfa_enabled },
      });
    }

    await recordAuthEvent("login_success", normalizedEmail, { ip, userId: user.id });
    const session = await completeLogin(user, meta);
    return ok(session);
  } catch (err) {
    return serverError(err);
  }
}
