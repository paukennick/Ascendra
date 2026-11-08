import { type TxClient } from "../db";
import { purgeExpired, RETENTION } from "../retention";

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
// purgeExpiredAuthData is the retention purge (see below): run daily by
// GET /api/cron/purge-auth-data (vercel.json crons; CRON_SECRET).

export const AUTH_RETENTION_DAYS = RETENTION.authEventsDays; // 90

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
  emailVerificationTokens: number;
  emailChangeTokens: number;
}

// Release 2026-11-07 merge: line A's purge (this file, REQ-116) and line B's
// (lib/retention.ts, REQ-093) ran over the same tables with different
// windows. There is now one purge, lib/retention.ts purgeExpired(), with
// B's periods (which the Privacy Policy states and lib/retention.test.ts
// pins): sign-in log 90 days (AUTH_RETENTION_DAYS, unchanged), ended
// sessions 30 days -- only whole ended token families, so a revoked token
// still catches reuse while its family is alive -- and used or expired
// one-time tokens and challenges 7 days. Every window is at or under A's 90
// days. This wrapper keeps A's name and result shape for its cron route.
export async function purgeExpiredAuthData(): Promise<PurgeCounts> {
  const r = await purgeExpired();
  return {
    authEvents: r.auth_events ?? 0,
    loginChallenges: r.login_challenges ?? 0,
    passwordResetTokens: r.password_reset_tokens ?? 0,
    refreshTokens: r.refresh_tokens ?? 0,
    emailVerificationTokens: r.email_verification_tokens ?? 0,
    emailChangeTokens: r.email_change_tokens ?? 0,
  };
}
