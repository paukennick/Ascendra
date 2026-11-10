import crypto from "node:crypto";
import { query, queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError, readJson } from "@/lib/http";
import { getLoginChallenge, getChallengeEmailCode, consumeLoginChallenge, ChallengeError } from "@/lib/auth/mfaChallenge";
import { verifyTotpCode, verifyBackupCode, verifyEmailCode } from "@/lib/auth/mfa";
import { decrypt } from "@/lib/auth/crypto";
import { completeLogin } from "@/lib/auth/session";
import { sessionResponse } from "@/lib/auth/refreshCookie";
import {
  consumeRateLimit,
  recordAuthEvent,
  RateLimitError,
  MFA_USER_EVENT,
  MFA_USER_LIMIT,
  MFA_USER_LOCKED_MESSAGE,
} from "@/lib/auth/rateLimit";
import { getClientIp, getUserAgent } from "@/lib/auth/util";

export const dynamic = "force-dynamic";

// POST /api/auth/mfa/verify — { challengeToken, code, deviceLabel? } — the
// second step of login for an mfa_enabled account. `code` can be a 6-digit
// TOTP code, a 6-digit code emailed via
// /api/auth/mfa/challenge/send-email-code, or one of the account's unused
// backup codes -- whichever method(s) the account has enabled.
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const { challengeToken, code, deviceLabel } = body ?? {};
    if (!challengeToken || typeof challengeToken !== "string" || !code || typeof code !== "string") {
      return badRequest("challengeToken and code are required");
    }

    // Rate limit per challenge, not per user -- an attacker who intercepted
    // someone else's challengeToken shouldn't get unlimited guesses at it
    // within its 10-minute window, independent of anything else the account
    // owner is doing.
    const challengeKey = crypto.createHash("sha256").update(challengeToken).digest("hex");
    try {
      await consumeRateLimit("mfa_verify_attempt", challengeKey, { max: 8, windowMinutes: 10 });
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

    const user = await queryOne<{
      id: string;
      email: string;
      display_name: string | null;
      totp_secret_enc: string | null;
      email_mfa_enabled: boolean;
    }>(`select id, email, display_name, totp_secret_enc, email_mfa_enabled from app_users where id = $1`, [
      challenge.userId,
    ]);
    if (!user || (!user.totp_secret_enc && !user.email_mfa_enabled)) {
      return unauthorized("MFA is not configured for this account.");
    }

    // REQ-116 (audit 3, finding 4): the per-challenge cap above allowed 8
    // guesses per login, and anyone with the password can start as many
    // logins as they like. Code checks are now also counted per ACCOUNT
    // across every challenge (MFA_USER_LIMIT); a correct code clears the
    // count, so the owner is never held back by their own earlier typos.
    try {
      await consumeRateLimit(MFA_USER_EVENT, user.id, MFA_USER_LIMIT, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) {
        return new Response(JSON.stringify({ error: MFA_USER_LOCKED_MESSAGE }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw err;
    }

    let matched = user.totp_secret_enc ? await verifyTotpCode(decrypt(user.totp_secret_enc), code) : false;

    if (!matched && user.email_mfa_enabled) {
      const emailCode = await getChallengeEmailCode(challenge.id);
      if (emailCode) matched = await verifyEmailCode(code, emailCode.hash);
    }

    // A matched backup code is only identified here; it is spent together
    // with the challenge below, so concurrent requests can't both use it.
    let backupCodeId: string | null = null;
    if (!matched) {
      const backupCodes = await query<{ id: string; code_hash: string }>(
        `select id, code_hash from mfa_backup_codes where user_id = $1 and used_at is null`,
        [user.id]
      );
      for (const bc of backupCodes) {
        if (await verifyBackupCode(code, bc.code_hash)) {
          backupCodeId = bc.id;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      return unauthorized("Incorrect code.");
    }

    const consumed = await consumeLoginChallenge(challenge.id, backupCodeId);
    if (consumed === "challenge_used") return unauthorized("Login challenge already used.");
    if (consumed === "backup_code_used") return unauthorized("Incorrect code.");
    await query(`delete from auth_events where event_type = $1 and identifier = $2`, [MFA_USER_EVENT, user.id]);
    await recordAuthEvent("login_success", user.email, { ip: getClientIp(req), userId: user.id });

    const session = await completeLogin(user, {
      deviceLabel: typeof deviceLabel === "string" ? deviceLabel : null,
      userAgent: getUserAgent(req),
      ip: getClientIp(req),
    });
    return sessionResponse(req, session);
  } catch (err) {
    return serverError(err);
  }
}
