import crypto from "node:crypto";
import { query, queryOne } from "@/lib/db";
import { ok, badRequest, serverError } from "@/lib/http";
import { hashPassword } from "@/lib/auth/passwords";
import { revokeAllRefreshTokens } from "@/lib/auth/tokens";

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
    const row = await queryOne<{ id: string; user_id: string }>(
      `select id, user_id from password_reset_tokens
       where token_hash = $1 and consumed_at is null and expires_at > now()`,
      [tokenHash]
    );
    if (!row) {
      return badRequest("This reset link is invalid or has expired. Request a new one.");
    }

    const passwordHash = await hashPassword(newPassword);
    await query(
      `update app_users set password_hash = $1, failed_login_count = 0, locked_until = null where id = $2`,
      [passwordHash, row.user_id]
    );
    await query(`update password_reset_tokens set consumed_at = now() where id = $1`, [row.id]);
    await revokeAllRefreshTokens(row.user_id);

    return ok({ message: "Password reset. Log in with your new password." });
  } catch (err) {
    return serverError(err);
  }
}
