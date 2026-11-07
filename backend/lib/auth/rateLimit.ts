import { query, queryOne, withTransaction } from "../db";

export class RateLimitError extends Error {}

// Writes one row to auth_events. Every auth-adjacent action (register
// attempt, login success/failure, password-reset request, ...) should call
// this so checkRateLimit below has something to count against.
export async function recordAuthEvent(
  eventType: string,
  identifier: string,
  opts: { userId?: string | null; ip?: string | null } = {}
): Promise<void> {
  await query(`insert into auth_events (event_type, identifier, user_id, ip) values ($1, $2, $3, $4)`, [
    eventType,
    identifier.toLowerCase(),
    opts.userId ?? null,
    opts.ip ?? null,
  ]);
}

// Throws RateLimitError once `eventType` has fired `max` or more times for
// `identifier` within the last `windowMinutes`. Backed by auth_events --
// no separate cache/Redis layer needed for a project this size.
export async function checkRateLimit(
  eventType: string,
  identifier: string,
  opts: { max: number; windowMinutes: number }
): Promise<void> {
  const row = await queryOne<{ count: string }>(
    `select count(*)::text as count from auth_events
     where event_type = $1 and identifier = $2 and created_at > now() - ($3 || ' minutes')::interval`,
    [eventType, identifier.toLowerCase(), String(opts.windowMinutes)]
  );
  const count = row ? parseInt(row.count, 10) : 0;
  if (count >= opts.max) {
    throw new RateLimitError(`Too many ${eventType} attempts. Try again later.`);
  }
}

// REQ-098: turning MFA off (either method) checks the password and, for the
// last method, a 6-digit emailed code, and each first call sends an email.
// None of that was limited, so a stolen 15-minute access token allowed
// unlimited password and code guesses. One budget per user covers both
// disable routes; the normal flow uses two calls per method.
export const MFA_DISABLE_EVENT = "mfa_disable_attempt";
export const MFA_DISABLE_LIMIT = { max: 10, windowMinutes: 15 };

// REQ-098: check-and-record as one atomic step. checkRateLimit followed by
// recordAuthEvent is two statements, so N requests sent at once all read
// "under the limit" before any of them records, and all N get through --
// N model calls on grade/chat/pbq, N guesses past the 8-guess cap on an MFA
// challenge. Here a transaction-scoped advisory lock on (event, identifier)
// makes concurrent callers take turns: each counts, then records, before
// the next one counts. A rejected call records nothing, same as before.
// Works on Supabase's transaction-mode pooler (one backend per transaction).
// Routes use this; checkRateLimit/recordAuthEvent stay for logging-only
// events (login_fail, login_success) and existing callers.
export async function consumeRateLimit(
  eventType: string,
  identifier: string,
  limit: { max: number; windowMinutes: number },
  opts: { userId?: string | null; ip?: string | null } = {}
): Promise<void> {
  const id = identifier.toLowerCase();
  await withTransaction(async (tx) => {
    await tx.query(`select pg_advisory_xact_lock(hashtext($1))`, [`rate:${eventType}:${id}`]);
    const row = await tx.queryOne<{ count: number }>(
      `select count(*)::int as count from auth_events
        where event_type = $1 and identifier = $2 and created_at > now() - make_interval(mins => $3)`,
      [eventType, id, limit.windowMinutes]
    );
    if ((row?.count ?? 0) >= limit.max) {
      throw new RateLimitError(`Too many ${eventType} attempts. Try again later.`);
    }
    await tx.query(`insert into auth_events (event_type, identifier, user_id, ip) values ($1, $2, $3, $4)`, [
      eventType,
      id,
      opts.userId ?? null,
      opts.ip ?? null,
    ]);
  });
}
