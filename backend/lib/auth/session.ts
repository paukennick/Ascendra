import { query, queryOne } from "../db";
import { signAccessToken, createRefreshToken, type RefreshTokenMeta } from "./tokens";
import { sendSecurityAlertEmail } from "../email";

export interface SessionUser {
  id: string;
  email: string;
  display_name: string | null;
}

// Shared by the non-MFA login path, Google sign-in, and /api/auth/mfa/verify
// -- all three end the same way once the account is fully confirmed: clear
// lockout counters, stamp last_login_at, issue a fresh access+refresh token
// pair, and (best-effort) notify the account if this user_agent hasn't
// created a session for this user before.
export async function completeLogin(user: SessionUser, meta: RefreshTokenMeta) {
  await query(`update app_users set failed_login_count = 0, locked_until = null, last_login_at = now() where id = $1`, [
    user.id,
  ]);

  if (meta.userAgent) {
    const known = await queryOne<{ id: string }>(
      `select id from refresh_tokens where user_id = $1 and user_agent = $2 limit 1`,
      [user.id, meta.userAgent]
    );
    if (!known) {
      sendSecurityAlertEmail(
        user.email,
        "New sign-in to your Ascendra account",
        "Your account was just signed in to from a device we haven't seen before."
      ).catch(() => undefined);
    }
  }

  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refresh = await createRefreshToken(user.id, meta);

  return {
    accessToken,
    refreshToken: refresh.raw,
    user: { id: user.id, email: user.email, displayName: user.display_name },
  };
}
