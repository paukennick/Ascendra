import { query, type TxClient } from "../db";

// REQ-116 (audit 3, finding 5): what is kept about sign-in activity, and for
// how long.
//
// auth_events holds rate-limit counters and the sign-in log; its rows carry
// the email address (as the identifier) and the IP. Account deletion only
// cleared user_id (on delete set null), so a deleted learner's address and
// IPs stayed forever, and nothing ever removed old rows.
//
// purgeUserAuthEvents runs inside the deletion transaction and removes every
// row tied to the account: by user id, by the address (normalised to lower
// case, as recordAuthEvent stores it), by the per-device login keys
// "<address>|<ip>", and by the user id used as a rate-limit identifier.
//
// purgeExpiredAuthData is the retention purge: rows older than
// AUTH_RETENTION_DAYS (90) in auth_events, plus spent or expired
// credentials that also carry an IP (login challenges, reset links,
// refresh tokens revoked or expired that long ago). Run daily by
// GET /api/cron/purge-auth-data (vercel.json crons; CRON_SECRET).

export const AUTH_RETENTION_DAYS = 90;

export async function purgeUserAuthEvents(tx: TxClient, userId: string, email: string): Promise<number> {
  const e = email.toLowerCase().trim();
  const like = `${e.slice(0, 190).replace(/[\\%_]/g, (c) => "\\" + c)}|%`;
  const rows = await tx.query<{ id: string }>(
    `delete from auth_events
      where user_id = $1 or identifier = $2 or identifier = $3::text or identifier like $4 escape '\\'
      returning id`,
    [userId, e, userId.toLowerCase(), like]
  );
  return rows.length;
}

export interface PurgeCounts {
  authEvents: number;
  loginChallenges: number;
  passwordResetTokens: number;
  refreshTokens: number;
}

export async function purgeExpiredAuthData(days = AUTH_RETENTION_DAYS): Promise<PurgeCounts> {
  const count = async (sql: string) => (await query<{ n: number }>(`with d as (${sql} returning 1) select count(*)::int as n from d`, [days]))[0]?.n ?? 0;
  return {
    authEvents: await count(`delete from auth_events where created_at < now() - make_interval(days => $1)`),
    loginChallenges: await count(`delete from login_challenges where expires_at < now() - make_interval(days => $1)`),
    passwordResetTokens: await count(
      `delete from password_reset_tokens where expires_at < now() - make_interval(days => $1)`
    ),
    refreshTokens: await count(
      `delete from refresh_tokens
        where coalesce(revoked_at, expires_at) < now() - make_interval(days => $1)
          and (revoked_at is not null or expires_at < now())`
    ),
  };
}
