import { queryOne, query } from "../db";

// REQ-135: login lockout without a read-then-write race.
//
// The login route used to read failed_login_count, verify the password, and
// write back count + 1. Wrong-password guesses sent in parallel all read the
// same count and all wrote 1, so the five-try lockout never triggered.
//
// Now every password check first reserves an attempt with one guarded
// UPDATE. The reservation that brings the count to MAX_FAILED_ATTEMPTS also
// sets locked_until, so at most MAX_FAILED_ATTEMPTS checks can run per
// lockout window however many requests arrive at once; the rest get 423
// without a password check. A correct password clears the count and the
// lock (clearLoginFailures). Setting the lock at reservation time, rather
// than after a failed check, means a request that crashes mid-check cannot
// leave the count at MAX with no expiry: the lock always ends.
//
// After a lock expires the next reservation starts a fresh count of 1.

// REQ-116 (audit 3, low): anyone who knew an address could lock its owner
// out for 15 minutes, again and again, with five wrong passwords. The
// five-try limit is now per (email, IP) pair -- LOGIN_PAIR_LIMIT below,
// counted in auth_events -- so a stranger's guesses pause only that
// stranger's own (address, IP) pair. This per-account counter stays as a backstop against guessing
// spread across many IPs, at a threshold one attacker can't reach casually.
// Refusals answer exactly like a wrong password (401, same message, same
// bcrypt time), so a lock doesn't reveal that the account exists.
export const MAX_FAILED_ATTEMPTS = 50;
export const LOCKOUT_MINUTES = 15;

export const LOGIN_PAIR_EVENT = "login_attempt";
export const LOGIN_PAIR_LIMIT = { max: 5, windowMinutes: 15 };

// auth_events.identifier is varchar(255): emails are capped at 254 by the
// routes, so the address part is cut to 190 and the IP to 64.
const pairEmail = (email: string) => email.toLowerCase().trim().slice(0, 190);
export function loginPairKey(email: string, ip: string | null): string {
  return `${pairEmail(email)}|${(ip ?? "unknown").slice(0, 64)}`;
}

// A correct password (or a reset) clears the pair counts for the address,
// so the owner's earlier typos don't count against the next sign-in.
export async function clearLoginPairs(email: string): Promise<void> {
  const e = pairEmail(email);
  await query(
    `delete from auth_events where event_type = $1 and identifier like $2 escape '\\'`,
    [LOGIN_PAIR_EVENT, `${e.replace(/[\\%_]/g, (c) => "\\" + c)}|%`]
  );
}

export async function reserveLoginAttempt(userId: string): Promise<boolean> {
  const row = await queryOne<{ failed_login_count: number }>(
    `update app_users
        set failed_login_count = case when locked_until is not null and locked_until <= now()
                                      then 1 else failed_login_count + 1 end,
            locked_until = case
              when (case when locked_until is not null and locked_until <= now()
                         then 1 else failed_login_count + 1 end) >= $2
                then now() + make_interval(mins => $3)
              when locked_until is not null and locked_until <= now() then null
              else locked_until
            end
      where id = $1
        and ((locked_until is null and failed_login_count < $2) or locked_until <= now())
      returning failed_login_count`,
    [userId, MAX_FAILED_ATTEMPTS, LOCKOUT_MINUTES]
  );
  return row !== null;
}

export async function clearLoginFailures(userId: string): Promise<void> {
  await query(`update app_users set failed_login_count = 0, locked_until = null where id = $1`, [userId]);
}
