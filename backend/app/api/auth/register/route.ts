import crypto from "node:crypto";
import { query, queryOne } from "@/lib/db";
import { ok, badRequest, tooManyRequests, serverError, readJson } from "@/lib/http";
import { hashPassword } from "@/lib/auth/passwords";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { getClientIp } from "@/lib/auth/util";
import { mayEmail } from "@/lib/auth/mailLimit";
import { sendAlreadyRegisteredEmail, sendVerificationEmail } from "@/lib/email";
import { logEmailFailure } from "@/lib/email-errors";
import { recordSignupTermsAcceptance, signupAcceptedVersion, legalContext } from "@/lib/legal";
import { LATEST_RELEASE_NOTE_ID } from "@/lib/release-notes";
import { ageConfirmationRequired, isAgeConfirmed, MINIMUM_AGE } from "@/lib/age-confirmation";

export const dynamic = "force-dynamic";

const TOKEN_TTL_HOURS = 24;
const CREATED_MESSAGE = "Account created. Check your email to verify it before logging in.";

// POST /api/auth/register — { email, password, displayName?, acceptedTermsVersion?, ageConfirmed }
//
// REQ-205: ageConfirmed must be the boolean true ("I am 16 or older"), for
// every request, whether or not the address already has an account -- so the
// answer still tells nobody which addresses exist. It is recorded on the new
// account.
//
// REQ-116 (audit 3, finding 8 and a low): every outcome answers the same
// 201 and message, so registration no longer tells anyone which addresses
// have accounts. What happens differs only by mail:
//   - new address: the account is created and a verification link sent;
//   - verified account already there: its owner is told someone tried
//     (nothing changes);
//   - UNVERIFIED account already there: someone may have registered this
//     address before its owner (squatting). Nothing changes now, but the
//     address gets a set_password link, and every outstanding verification
//     link for the account becomes one too. Following any of them verifies
//     the address, removes the first registrant's password, signs out every
//     session and lets the inbox owner choose a password
//     (lib/auth/emailTokens.ts). The first registrant's password can then
//     never go live through the owner's click.
// Every mail also counts against the target address (lib/auth/mailLimit.ts).
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const { email, password, displayName } = body ?? {};
    // REQ-119 sends one version string (acceptedTermsVersion); REQ-093 sends
    // the Terms and Privacy versions separately (termsVersion,
    // privacyVersion). Either, when current, records both documents.
    // REQ-175: a legacy client (no X-Ascendra-App) may have shown the previous text.
    const termsCtx = legalContext(req);
    const acceptedTermsVersion = signupAcceptedVersion(body, termsCtx);
    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return badRequest("email and password are required");
    }
    if (password.length < 8) {
      return badRequest("password must be at least 8 characters");
    }
    if (password.length > 1024) return badRequest("password is too long");
    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail.length > 254 || !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(normalizedEmail)) {
      return badRequest("A valid email is required");
    }
    if (displayName !== undefined && displayName !== null && (typeof displayName !== "string" || displayName.length > 100)) {
      return badRequest("displayName must be at most 100 characters");
    }
    if (!isAgeConfirmed(body)) return ageConfirmationRequired();
    const ip = getClientIp(req);

    try {
      await consumeRateLimit("register", ip ?? normalizedEmail, { max: 5, windowMinutes: 60 }, { ip });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }

    const existing = await queryOne<{ id: string; email_verified_at: string | null }>(
      "select id, email_verified_at from app_users where email = $1",
      [normalizedEmail]
    );
    if (existing) {
      if (!existing.email_verified_at) {
        await query(
          `update email_verification_tokens set set_password = true where user_id = $1 and consumed_at is null`,
          [existing.id]
        );
      }
      if (await mayEmail(normalizedEmail)) {
        try {
          if (existing.email_verified_at) {
            await sendAlreadyRegisteredEmail(normalizedEmail);
          } else {
            const raw = await issueVerificationToken(existing.id, true);
            await sendVerificationEmail(normalizedEmail, raw, { setPassword: true });
          }
        } catch (err) {
          // REQ-191: logged (no address or token); the answer stays the same
          // so it can't tell anyone which addresses have accounts.
          logEmailFailure("auth/register", err);
        }
      }
      return ok({ message: CREATED_MESSAGE }, 201);
    }

    const passwordHash = await hashPassword(password);
    // REQ-140: a new account has seen every release note so far, so "What's
    // new" never interrupts its first run.
    const userRow = await queryOne<{ id: string }>(
      `insert into app_users (email, display_name, password_hash, whats_new_seen_id, age_confirmed_at, age_confirmed_min)
       values ($1, $2, $3, $4, now(), $5)
       on conflict (email) do nothing returning id`,
      [normalizedEmail, displayName ?? null, passwordHash, LATEST_RELEASE_NOTE_ID, MINIMUM_AGE]
    );
    // Lost a race with another registration of the same address: answer
    // the same way as above, without mail.
    if (!userRow) return ok({ message: CREATED_MESSAGE }, 201);
    // REQ-119: the sign-up form's "I agree" (version + time); none sent means
    // the account is asked once on its first launch instead.
    await recordSignupTermsAcceptance(userRow.id, acceptedTermsVersion, "register", termsCtx);

    const rawToken = await issueVerificationToken(userRow.id, false);
    if (await mayEmail(normalizedEmail)) {
      // REQ-191: the account exists either way; the learner can resend from
      // the "Check your email" screen. Logged so a failure shows up.
      await sendVerificationEmail(normalizedEmail, rawToken).catch((err) => logEmailFailure("auth/register", err));
    }

    return ok({ message: CREATED_MESSAGE }, 201);
  } catch (err) {
    return serverError(err);
  }
}

async function issueVerificationToken(userId: string, setPassword: boolean): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
  await query(
    `insert into email_verification_tokens (user_id, token_hash, expires_at, set_password) values ($1, $2, $3, $4)`,
    [userId, tokenHash, expiresAt, setPassword]
  );
  return rawToken;
}
