import { query, queryOne } from "../db";

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
