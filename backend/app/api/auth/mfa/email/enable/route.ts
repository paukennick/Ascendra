import { query, queryOne, withTransaction } from "@/lib/db";
import { ok, badRequest, unauthorized, tooManyRequests, serverError, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { verifyEmailCode, generateBackupCodes } from "@/lib/auth/mfa";
import { endOtherSessions } from "@/lib/auth/sessionControl";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { sendSecurityAlertEmail } from "@/lib/email";
import { emailFailureHandler } from "@/lib/email-errors";

export const dynamic = "force-dynamic";

// REQ-203 (FAIL-862): the 6-digit pending code had no attempt limit, so a
// stolen access token could try all million of them within its life (the
// code is valid 10 minutes). Five tries per 10 minutes, and the fifth wrong
// one throws the pending code away so the next code has to be requested.
export const EMAIL_ENABLE_EVENT = "mfa_email_enable_attempt";
export const EMAIL_ENABLE_LIMIT = { max: 5, windowMinutes: 10 };

// POST /api/auth/mfa/email/enable — { code } — proves the code from
// /api/auth/mfa/email/setup actually reached the user's inbox, then turns
// email-code MFA on and issues its own set of backup codes, independent of
// TOTP's (see /api/auth/mfa/enable).
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    const { code } = body ?? {};
    if (!code || typeof code !== "string") {
      return badRequest("code is required");
    }

    try {
      await consumeRateLimit(EMAIL_ENABLE_EVENT, user.id, EMAIL_ENABLE_LIMIT, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) {
        return tooManyRequests("Too many tries. Wait 10 minutes, then ask for a new code.");
      }
      throw err;
    }

    const row = await queryOne<{
      email_mfa_pending_code_hash: string | null;
      email_mfa_pending_expires_at: string | null;
    }>(`select email_mfa_pending_code_hash, email_mfa_pending_expires_at from app_users where id = $1`, [user.id]);
    if (!row?.email_mfa_pending_code_hash || !row.email_mfa_pending_expires_at) {
      return badRequest("No pending email code found. Call /api/auth/mfa/email/setup first.");
    }
    if (new Date(row.email_mfa_pending_expires_at).getTime() < Date.now()) {
      return badRequest("Code expired. Call /api/auth/mfa/email/setup again to get a new one.");
    }

    const valid = await verifyEmailCode(code, row.email_mfa_pending_code_hash);
    if (!valid) {
      // This attempt is already counted; at the limit, drop the code so no
      // further guess can match it. Only the code that was checked is
      // cleared, not a fresh one requested meanwhile.
      const used = await queryOne<{ n: number }>(
        `select count(*)::int as n from auth_events
          where event_type = $1 and identifier = $2 and created_at > now() - make_interval(mins => $3)`,
        [EMAIL_ENABLE_EVENT, user.id, EMAIL_ENABLE_LIMIT.windowMinutes]
      );
      if ((used?.n ?? 0) >= EMAIL_ENABLE_LIMIT.max) {
        await query(
          `update app_users set email_mfa_pending_code_hash = null, email_mfa_pending_expires_at = null
            where id = $1 and email_mfa_pending_code_hash = $2`,
          [user.id, row.email_mfa_pending_code_hash]
        );
        return unauthorized("Incorrect code. That was the last try for this code, so request a new one.");
      }
      return unauthorized("Incorrect code.");
    }

    const { raw: backupCodes, hashed } = await generateBackupCodes();

    // REQ-203 (FAIL-869): one transaction for the activation, the backup-code
    // swap and ending other sessions. The update only matches while the
    // pending code is still the one that was checked, so two requests with
    // the same good code enable once.
    const result = await withTransaction(async (tx) => {
      const claimed = await tx.query(
        `update app_users set mfa_enabled = true, email_mfa_enabled = true,
           email_mfa_pending_code_hash = null, email_mfa_pending_expires_at = null
         where id = $1 and email_mfa_pending_code_hash = $2 returning id`,
        [user.id, row.email_mfa_pending_code_hash]
      );
      if (claimed.length === 0) return null;
      await tx.query(`delete from mfa_backup_codes where user_id = $1 and method = 'email'`, [user.id]);
      await tx.query(`insert into mfa_backup_codes (user_id, method, code_hash) select $1, 'email', unnest($2::text[])`, [
        user.id,
        hashed,
      ]);
      // REQ-116: same as /api/auth/mfa/enable -- other devices are signed out.
      return { accessToken: await endOtherSessions(user, tx) };
    });
    if (!result) return badRequest("No pending email code found. Call /api/auth/mfa/email/setup first.");

    // The wrong-guess count restarts for the next enrollment.
    await query(`delete from auth_events where event_type = $1 and identifier = $2`, [EMAIL_ENABLE_EVENT, user.id]).catch(
      () => undefined
    );

    await sendSecurityAlertEmail(
      user.email,
      "Two-factor authentication was turned on",
      "Email codes were just added as a sign-in step on your Ascendra account. Other devices have been signed out."
    ).catch(emailFailureHandler("auth/mfa/email/enable"));

    const accessToken = result.accessToken;
    return ok({ enabled: true, backupCodes, ...(accessToken ? { accessToken } : {}) });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
