import { queryOne, withTransaction } from "@/lib/db";
import { ok, badRequest, unauthorized, tooManyRequests, serverError, readJson } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";
import { endOtherSessions } from "@/lib/auth/sessionControl";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { REAUTH_EVENT, REAUTH_LIMIT } from "@/lib/auth/reauth";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { MAX_PASSWORD_LENGTH } from "@/lib/auth/passwords";
import { sendSecurityAlertEmail } from "@/lib/email";
import { emailFailureHandler } from "@/lib/email-errors";

export const dynamic = "force-dynamic";

// POST /api/auth/change-password — { currentPassword, newPassword }.
// Only ever updates the authenticated caller's own row. Since REQ-116 every
// OTHER session is revoked and every access token already issued stops
// working at once; the caller keeps its session and gets `accessToken`.
export async function POST(req: Request) {
  try {
    const authUser = await requireUser(req);
    const body = await readJson(req);
    const { currentPassword, newPassword } = body ?? {};
    if (!currentPassword || typeof currentPassword !== "string" || !newPassword || typeof newPassword !== "string") {
      return badRequest("currentPassword and newPassword are required");
    }
    if (newPassword.length < 8) {
      return badRequest("newPassword must be at least 8 characters");
    }
    // REQ-219 (FAIL-1111): the same ceiling register has (a bcrypt hash of an
    // enormous string is a cheap way to burn the server's time).
    if (newPassword.length > MAX_PASSWORD_LENGTH || currentPassword.length > MAX_PASSWORD_LENGTH) {
      return badRequest("password is too long");
    }

    const row = await queryOne<{ password_hash: string | null }>(
      "select password_hash from app_users where id = $1",
      [authUser.id]
    );
    if (!row?.password_hash) {
      return badRequest("This account doesn't use a password. Sign in with Google instead.");
    }
    // REQ-116 (audit 3, low): current-password guesses were unlimited for
    // anyone holding an access token. They now share the per-account
    // re-authentication budget (lib/auth/reauth.ts).
    try {
      await consumeRateLimit(REAUTH_EVENT, authUser.id, REAUTH_LIMIT, { userId: authUser.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests("Too many tries. For your security, wait 15 minutes and try again.");
      throw err;
    }
    const valid = await verifyPassword(currentPassword, row.password_hash);
    if (!valid) return badRequest("Current password is incorrect.");

    const newHash = await hashPassword(newPassword);
    // REQ-203 (FAIL-869): the new hash, the revoked sessions and the version
    // bump are one transaction. Done separately, a failure after the first
    // statement left the new password set while the old sessions (and any
    // stolen token) stayed live.
    // REQ-116: every other session and every access token already issued
    // end now (token_version); this device keeps its session and gets a
    // fresh access token.
    const accessToken = await withTransaction(async (tx) => {
      await tx.query("update app_users set password_hash = $1 where id = $2", [newHash, authUser.id]);
      // REQ-219 (FAIL-1112): spend what was issued before the change, as a
      // reset does. A reset link mailed earlier (a leaked inbox, say) could
      // otherwise set the password again afterwards, and a pending sign-in
      // code step was earned with the old password. Same transaction, so a
      // failure leaves all of it as it was.
      await tx.query(`update password_reset_tokens set consumed_at = now() where user_id = $1 and consumed_at is null`, [
        authUser.id,
      ]);
      await tx.query(`update login_challenges set consumed_at = now() where user_id = $1 and consumed_at is null`, [
        authUser.id,
      ]);
      return endOtherSessions(authUser, tx);
    });

    await sendSecurityAlertEmail(
      authUser.email,
      "Your Ascendra password was changed",
      "Your account password was just changed. All other devices have been signed out."
    ).catch(emailFailureHandler("auth/change-password"));

    return ok({ message: "Password changed. Other devices have been signed out.", ...(accessToken ? { accessToken } : {}) });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
