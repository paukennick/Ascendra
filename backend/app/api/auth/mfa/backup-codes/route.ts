import { NextResponse } from "next/server";
import { queryOne, withTransaction } from "@/lib/db";
import { ok, badRequest, unauthorized, tooManyRequests, serverError, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { generateBackupCodes } from "@/lib/auth/mfa";
import { verifyPassword } from "@/lib/auth/passwords";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { REAUTH_EVENT, REAUTH_LIMIT } from "@/lib/auth/reauth";

export const dynamic = "force-dynamic";

// POST /api/auth/mfa/backup-codes — { password, method } — invalidates the
// existing backup codes for that one method ("totp" or "email") and issues
// 10 new ones, leaving the other method's codes untouched. Requires the
// password again, same reasoning as /api/auth/mfa/disable: a held access
// token alone shouldn't be able to mint new recovery codes.
//
// REQ-203 (FAIL-863): that password check was not rate-limited, so a stolen
// access token could guess the password without limit here even though every
// other re-authentication is capped. It now spends the shared per-account
// budget (REAUTH_EVENT) before the password is compared, as change-password
// does.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    const { password, method } = body ?? {};
    if (!password || typeof password !== "string") {
      return badRequest("password is required");
    }
    if (method !== "totp" && method !== "email") {
      return badRequest('method must be "totp" or "email"');
    }

    const row = await queryOne<{ password_hash: string | null; totp_secret_enc: string | null; email_mfa_enabled: boolean }>(
      `select password_hash, totp_secret_enc, email_mfa_enabled from app_users where id = $1`,
      [user.id]
    );
    const methodEnabled = method === "totp" ? !!row?.totp_secret_enc : !!row?.email_mfa_enabled;
    if (!methodEnabled) {
      return badRequest(`${method === "totp" ? "Authenticator app codes are" : "Email codes are"} not enabled on this account.`);
    }
    // A wrong password is a 401 about what was typed, not the session, so it
    // carries reauthRequired and the app doesn't refresh and resend it (which
    // would spend two tries on one guess).
    const wrongPassword = () => NextResponse.json({ error: "Incorrect password.", reauthRequired: true }, { status: 401 });
    if (!row?.password_hash) return wrongPassword();
    try {
      await consumeRateLimit(REAUTH_EVENT, user.id, REAUTH_LIMIT, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) {
        return tooManyRequests("Too many tries. For your security, wait 15 minutes and try again.");
      }
      throw err;
    }
    if (!(await verifyPassword(password, row.password_hash))) return wrongPassword();

    const { raw: backupCodes, hashed } = await generateBackupCodes();
    // REQ-203 (FAIL-869): delete and insert together, so a failure between
    // them can't leave the method with no recovery codes at all.
    await withTransaction(async (tx) => {
      await tx.query(`delete from mfa_backup_codes where user_id = $1 and method = $2`, [user.id, method]);
      await tx.query(`insert into mfa_backup_codes (user_id, method, code_hash) select $1, $2, unnest($3::text[])`, [
        user.id,
        method,
        hashed,
      ]);
    });

    return ok({ backupCodes });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
