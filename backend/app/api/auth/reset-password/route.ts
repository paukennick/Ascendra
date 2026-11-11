import crypto from "node:crypto";
import { queryOne, withTransaction } from "@/lib/db";
import { ok, badRequest, serverError, readJson } from "@/lib/http";
import { hashPassword, MAX_PASSWORD_LENGTH } from "@/lib/auth/passwords";
import { bumpTokenVersion } from "@/lib/auth/sessionControl";
import { clearLoginPairs } from "@/lib/auth/lockout";

export const dynamic = "force-dynamic";

// POST /api/auth/reset-password — { token, newPassword }
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const { token, newPassword } = body ?? {};
    if (!token || typeof token !== "string" || !newPassword || typeof newPassword !== "string") {
      return badRequest("token and newPassword are required");
    }
    if (newPassword.length < 8) {
      return badRequest("newPassword must be at least 8 characters");
    }
    // REQ-219 (FAIL-1111): the same ceiling register has.
    if (newPassword.length > MAX_PASSWORD_LENGTH) return badRequest("password is too long");

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    // Cheap early check so an invalid link doesn't cost a bcrypt hash. It is
    // not the authority: the guarded consume below is.
    const row = await queryOne<{ id: string }>(
      `select id from password_reset_tokens
       where token_hash = $1 and consumed_at is null and expires_at > now()`,
      [tokenHash]
    );
    if (!row) {
      return badRequest("This reset link is invalid or has expired. Request a new one.");
    }

    const passwordHash = await hashPassword(newPassword);

    // Spend the token, set the password and drop every session in one
    // transaction. The guarded UPDATE lets exactly one of several concurrent
    // requests through; the rest change nothing.
    const reset = await withTransaction(async (tx) => {
      const consumed = await tx.queryOne<{ user_id: string }>(
        `update password_reset_tokens set consumed_at = now()
         where token_hash = $1 and consumed_at is null and expires_at > now()
         returning user_id`,
        [tokenHash]
      );
      if (!consumed) return false;
      // REQ-191: the reset link was opened from the account's inbox, which
      // proves the address as well as a verification link does. Without
      // this, an unverified account (verification mail lost or burned by a
      // scanner) reset its password and was still refused at login (403).
      // Its pending verification links are spent with it: one could carry
      // set_password (REQ-116) and would clear the password just chosen.
      await tx.query(
        `update app_users set password_hash = $1, failed_login_count = 0, locked_until = null,
                email_verified_at = coalesce(email_verified_at, now())
          where id = $2`,
        [passwordHash, consumed.user_id]
      );
      await tx.query(
        `update email_verification_tokens set consumed_at = now() where user_id = $1 and consumed_at is null`,
        [consumed.user_id]
      );
      await tx.query(`update refresh_tokens set revoked_at = now() where user_id = $1 and revoked_at is null`, [
        consumed.user_id,
      ]);
      // REQ-116: and every access token already issued.
      await bumpTokenVersion(consumed.user_id, tx);
      // REQ-135: spend every other outstanding credential that was issued
      // before the reset. Other reset links stayed valid until they expired,
      // so a second link (from a leaked inbox, say) could undo this reset.
      // A pending MFA login challenge was earned with the old password, and
      // a pending email change was requested from a session that is now
      // revoked; neither should survive a reset.
      await tx.query(
        `update password_reset_tokens set consumed_at = now() where user_id = $1 and consumed_at is null`,
        [consumed.user_id]
      );
      await tx.query(`update login_challenges set consumed_at = now() where user_id = $1 and consumed_at is null`, [
        consumed.user_id,
      ]);
      await tx.query(
        `update email_change_tokens set consumed_at = now() where user_id = $1 and consumed_at is null`,
        [consumed.user_id]
      );
      return (await tx.queryOne<{ email: string }>(`select email from app_users where id = $1`, [consumed.user_id]))?.email ?? "";
    });
    if (reset) await clearLoginPairs(reset);
    if (reset === false) {
      return badRequest("This reset link is invalid or has expired. Request a new one.");
    }

    return ok({ message: "Password reset. Log in with your new password." });
  } catch (err) {
    return serverError(err);
  }
}
