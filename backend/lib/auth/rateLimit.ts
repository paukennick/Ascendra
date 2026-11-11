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

// REQ-135: turning MFA off (either method) checks the password and, for the
// last method, a 6-digit emailed code, and each first call sends an email.
// None of that was limited, so a stolen 15-minute access token allowed
// unlimited password and code guesses. One budget per user covers both
// disable routes; the normal flow uses two calls per method.
export const MFA_DISABLE_EVENT = "mfa_disable_attempt";
export const MFA_DISABLE_LIMIT = { max: 10, windowMinutes: 15 };

// REQ-116 (audit 3, finding 4): MFA code checks at login, per account across
// every challenge (app/api/auth/mfa/verify). Cleared by a correct code.
export const MFA_USER_EVENT = "mfa_verify_user";
export const MFA_USER_LIMIT = { max: 10, windowMinutes: 15 };
export const MFA_USER_LOCKED_MESSAGE =
  "That's a lot of code attempts, so sign-in codes for this account are paused for 15 minutes to keep it safe. " +
  "Nothing is wrong with your account. Wait a little, then try again with a fresh code or a backup code.";

// REQ-219 (FAIL-1102): Google sign-ins per IP address (the route's own check
// before the token is verified), as register limits sign-ups per IP.
export const GOOGLE_SIGNIN_IP_LIMIT = { max: 30, windowMinutes: 15 };

// REQ-219 (FAIL-1105): password checks per IP address across every address
// tried, ahead of login's per-(address, IP) pair. Wrong guesses count; a
// correct password gives its attempt back, so a school or office behind one
// address is limited by its failures, not its sign-ins.
export const LOGIN_IP_EVENT = "login_ip";
export const LOGIN_IP_LIMIT = { max: 60, windowMinutes: 15 };

// REQ-135: check-and-record as one atomic step. checkRateLimit followed by
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
): Promise<string> {
  const id = identifier.toLowerCase();
  // REQ-118 (Audit 3 MEDIUM-8): count and record are one statement (the
  // insert only happens when the count is under the limit), so a call is
  // four round trips (begin, lock, count-and-record, commit) instead of six.
  // Still atomic: the lock is its own, earlier statement, so the counting
  // statement's snapshot is taken after the previous holder committed.
  // REQ-203: returns the recorded event's id so a caller that learns the
  // attempt was legitimate can give it back (refundRateLimit).
  const recorded = await withTransaction(async (tx) => {
    await tx.query(`select pg_advisory_xact_lock(hashtext($1))`, [`rate:${eventType}:${id}`]);
    const row = await tx.queryOne<{ id: string | null }>(
      `with c as (
         select count(*)::int as n from auth_events
          where event_type = $1 and identifier = $2 and created_at > now() - make_interval(mins => $3)
       ), ins as (
         insert into auth_events (event_type, identifier, user_id, ip)
         select $1, $2, $5::uuid, $6::varchar from c where c.n < $4::int
         returning id
       )
       select (select id::text from ins) as id`,
      [eventType, id, limit.windowMinutes, limit.max, opts.userId ?? null, opts.ip ?? null]
    );
    return row?.id ?? null;
  });
  if (!recorded) throw new RateLimitError(`Too many ${eventType} attempts. Try again later.`);
  return recorded;
}

// REQ-203 (FAIL-864): gives back one attempt that consumeRateLimit recorded.
// Used when the attempt turned out to be correct, so a lockout counts wrong
// guesses and not right answers. The attempt was already counted while it was
// in flight, so concurrent guesses still can't exceed the limit.
export async function refundRateLimit(eventId: string): Promise<void> {
  await query(`delete from auth_events where id = $1`, [eventId]);
}
