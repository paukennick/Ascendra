import { query } from "../db";
import { signAccessToken, createRefreshToken, type RefreshTokenMeta } from "./tokens";

export interface SessionUser {
  id: string;
  email: string;
  display_name: string | null;
}

// Shared by the non-MFA login path and /api/auth/mfa/verify -- both end the
// same way once the account is fully confirmed: clear lockout counters,
// stamp last_login_at, and issue a fresh access+refresh token pair.
export async function completeLogin(user: SessionUser, meta: RefreshTokenMeta) {
  await query(`update app_users set failed_login_count = 0, locked_until = null, last_login_at = now() where id = $1`, [
    user.id,
  ]);

  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refresh = await createRefreshToken(user.id, meta);

  return {
    accessToken,
    refreshToken: refresh.raw,
    user: { id: user.id, email: user.email, displayName: user.display_name },
  };
}
