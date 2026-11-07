import { query, queryOne, type TxClient } from "../db";
import { signAccessToken } from "./tokens";
import type { AuthenticatedUser } from "./requireUser";

// REQ-116 (audit 3): ending sessions for real.
//
// Revoking refresh tokens stops a device from getting NEW access tokens, but
// the access token it already holds stayed valid for up to 15 minutes. Each
// access token now carries the account's token_version (`ver`, migration
// 044) and requireUser refuses a stale one, so bumping the version ends
// every access token at once.
//
// When the caller should stay signed in (changing their password, turning
// on MFA, confirming it's them), its own refresh family is kept and the
// route hands back a fresh access token signed under the new version as
// `accessToken`; the app's API client adopts it (mobile/src/api/client.ts).
// A token from before 044 has no family, so then every session is revoked
// and the caller signs in again once.
//
// Cost: requireUser's extra read is one primary-key lookup. Measured on the
// local Postgres 16 (lib/auth-hardening.dbtest.ts, "requireUser costs one
// indexed lookup"): see the REQ-116 report for the numbers.

type Runner = TxClient;

export async function bumpTokenVersion(userId: string, tx?: Runner): Promise<number> {
  const sql = `update app_users set token_version = token_version + 1 where id = $1 returning token_version`;
  if (tx) {
    const rows = await tx.query<{ token_version: number }>(sql, [userId]);
    return rows[0]?.token_version ?? 0;
  }
  const row = await queryOne<{ token_version: number }>(sql, [userId]);
  return row?.token_version ?? 0;
}

// Revokes every refresh token of the user except the caller's own family
// (all of them when keepFamily is null).
export async function revokeOtherSessions(userId: string, keepFamily: string | null, tx?: Runner): Promise<void> {
  const sql = `update refresh_tokens set revoked_at = now()
                where user_id = $1 and revoked_at is null and ($2::uuid is null or family_id <> $2::uuid)`;
  if (tx) await tx.query(sql, [userId, keepFamily]);
  else await query(sql, [userId, keepFamily]);
}

// Signs the caller out everywhere else and returns a fresh access token for
// the caller's own session (null when the caller's token predates families,
// in which case its session was revoked too).
export async function endOtherSessions(user: AuthenticatedUser, tx?: Runner): Promise<string | null> {
  await revokeOtherSessions(user.id, user.familyId, tx);
  const ver = await bumpTokenVersion(user.id, tx);
  if (!user.familyId) return null;
  return signAccessToken({ sub: user.id, email: user.email, ver, fam: user.familyId });
}
