// REQ-093: deletes records that have outlived their purpose. Run daily by
// /api/cron/retention. The privacy policy states these periods, so change
// both together (lib/retention.test.ts pins the numbers).
//
// Nothing here touches study data, chats or support requests: those are kept
// while the account is open and removed when it is deleted. The one table
// that is purged whether or not its learner still exists is ai_calls
// (REQ-205): counts only, no text.
import { query } from "@/lib/db";

export const RETENTION = {
  // Sign-in and rate-limit log (event, email or user id, IP address). The
  // longest rate-limit window is 60 minutes; 90 days covers investigating
  // suspicious sign-ins and showing recent security activity.
  authEventsDays: 90,
  // Signed-out, revoked or expired sessions (device label, IP, user agent).
  endedSessionsDays: 30,
  // Expired or used one-time tokens and sign-in challenges.
  expiredTokensDays: 7,
  // REQ-139 (FAIL-528): email-change requests, kept longer than the other
  // one-time tokens because the "this wasn't me" link in the alert to the old
  // address (lib/auth/emailTokens.ts cancelEmailChangeToken) needs the row to
  // cancel the change and sign out every device. At 7 days the link stopped
  // working a week after the request expired.
  emailChangeDays: 30,
  // REQ-205 (Nick, 2026-11-09): the AI request counts (ai_calls: feature,
  // tokens, latency, ok; no text). Account deletion keeps them with user_id
  // set null; this is how long any of them is kept. The Privacy Policy
  // (mobile/src/content/legal.ts AI_COUNTS_MONTHS) and the delete-account
  // page state it.
  aiCallsMonths: 12,
} as const;

export interface PurgeResult {
  [table: string]: number;
}

export async function purgeExpired(): Promise<PurgeResult> {
  const out: PurgeResult = {};
  const run = async (name: string, sql: string, params: unknown[]) => {
    const rows = await query<{ n: number }>(`with d as (${sql} returning 1) select count(*)::int n from d`, params);
    out[name] = rows[0]?.n ?? 0;
  };
  await run("auth_events", `delete from auth_events where created_at < now() - ($1 || ' days')::interval`, [
    String(RETENTION.authEventsDays),
  ]);
  await run(
    "refresh_tokens",
    // Only whole families that have ended: a revoked token whose family still
    // has a live token is what lets reuse of a stolen token revoke the family.
    `delete from refresh_tokens rt
      where coalesce(rt.revoked_at, rt.expires_at) < now() - ($1 || ' days')::interval
        and (rt.revoked_at is not null or rt.expires_at < now())
        and not exists (
          select 1 from refresh_tokens live
           where live.family_id = rt.family_id and live.revoked_at is null and live.expires_at > now()
        )`,
    [String(RETENTION.endedSessionsDays)]
  );
  for (const t of ["email_verification_tokens", "password_reset_tokens", "login_challenges"]) {
    await run(t, `delete from ${t} where expires_at < now() - ($1 || ' days')::interval`, [String(RETENTION.expiredTokensDays)]);
  }
  await run("email_change_tokens", `delete from email_change_tokens where expires_at < now() - ($1 || ' days')::interval`, [
    String(RETENTION.emailChangeDays),
  ]);
  // REQ-219: webhook delivery ids (migration 075), only needed while a replay
  // of the delivery could still carry a valid signature or be retried.
  await run("inbound_email_events", `delete from inbound_email_events where claimed_at < now() - ($1 || ' days')::interval`, [
    String(RETENTION.expiredTokensDays),
  ]);
  // ai_calls has an index on created_at (migration 028), so this is a range
  // delete; each day it removes about one day of rows.
  await run("ai_calls", `delete from ai_calls where created_at < now() - ($1 || ' months')::interval`, [
    String(RETENTION.aiCallsMonths),
  ]);
  return out;
}

// Account deletion: line B's deleteAuthEventsFor was replaced in the
// 2026-11-07 merge by line A's purgeUserAuthEvents (lib/auth/retention.ts),
// which the account route runs inside its deletion transaction and which
// also removes the per-device login keys "<address>|<ip>".
