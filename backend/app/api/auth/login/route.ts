import { queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError, readJson } from "@/lib/http";
import { verifyPassword, verifyDummyPassword } from "@/lib/auth/passwords";
import { consumeRateLimit, recordAuthEvent, RateLimitError } from "@/lib/auth/rateLimit";
import { getClientIp, getUserAgent } from "@/lib/auth/util";
import { createLoginChallenge } from "@/lib/auth/mfaChallenge";
import { completeLogin } from "@/lib/auth/session";
import {
  reserveLoginAttempt,
  clearLoginFailures,
  clearLoginPairs,
  loginPairKey,
  LOGIN_PAIR_EVENT,
  LOGIN_PAIR_LIMIT,
} from "@/lib/auth/lockout";

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

// REQ-116 (audit 3, low): one answer for every failed sign-in -- unknown
// address, Google-only account, wrong password, or a paused (address, IP)
// pair -- with the same status (401), message and bcrypt cost, so neither
// the response nor its timing says whether an account exists. (Unknown
// addresses used to answer in 1-6 ms against ~300 ms, and a lock with 423.)
const LOGIN_FAILED = "Incorrect email or password. After 5 wrong tries, sign-in from this device pauses for 15 minutes.";

// POST /api/auth/login — { email, password, deviceLabel? }
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const { email, password, deviceLabel } = body ?? {};
    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return badRequest("email and password are required");
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail.length > 254 || password.length > 1024) return unauthorized(LOGIN_FAILED);
    const ip = getClientIp(req);
    const userAgent = getUserAgent(req);

    // At most LOGIN_PAIR_LIMIT checks per (address, IP), counted atomically
    // before anything else, for known and unknown addresses alike.
    try {
      await consumeRateLimit(LOGIN_PAIR_EVENT, loginPairKey(normalizedEmail, ip), LOGIN_PAIR_LIMIT, { ip });
    } catch (err) {
      if (!(err instanceof RateLimitError)) throw err;
      await verifyDummyPassword(password);
      return unauthorized(LOGIN_FAILED);
    }

    const user = await queryOne<UserRow>(
      `select id, email, display_name, password_hash, email_verified_at,
              mfa_enabled, totp_secret_enc, email_mfa_enabled
       from app_users where email = $1`,
      [normalizedEmail]
    );

    if (!user || !user.password_hash) {
      await verifyDummyPassword(password);
      await recordAuthEvent("login_fail", normalizedEmail, { ip });
      return unauthorized(LOGIN_FAILED);
    }

    // REQ-135: reserve this password check before running it (one guarded
    // UPDATE, see lib/auth/lockout.ts). Since REQ-116 this per-account count
    // is the backstop against guessing spread over many IPs.
    if (!(await reserveLoginAttempt(user.id))) {
      await verifyDummyPassword(password);
      return unauthorized(LOGIN_FAILED);
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      await recordAuthEvent("login_fail", normalizedEmail, { ip, userId: user.id });
      return unauthorized(LOGIN_FAILED);
    }
    await clearLoginFailures(user.id);
    await clearLoginPairs(normalizedEmail);

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
