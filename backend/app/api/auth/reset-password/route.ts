import crypto from "node:crypto";
import { queryOne, withTransaction } from "@/lib/db";
import { ok, badRequest, serverError } from "@/lib/http";
import { hashPassword } from "@/lib/auth/passwords";

export const dynamic = "force-dynamic";

// POST /api/auth/reset-password — { token, newPassword }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, newPassword } = body ?? {};
    if (!token || typeof token !== "string" || !newPassword || typeof newPassword !== "string") {
      return badRequest("token and newPassword are required");
    }
    if (newPassword.length < 8) {
      return badRequest("newPassword must be at least 8 characters");
    }

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
      await tx.query(
        `update app_users set password_hash = $1, failed_login_count = 0, locked_until = null where id = $2`,
        [passwordHash, consumed.user_id]
      );
      await tx.query(`update refresh_tokens set revoked_at = now() where user_id = $1 and revoked_at is null`, [
        consumed.user_id,
      ]);
      return true;
    });
    if (!reset) {
      return badRequest("This reset link is invalid or has expired. Request a new one.");
    }

    return ok({ message: "Password reset. Log in with your new password." });
  } catch (err) {
    return serverError(err);
  }
}
