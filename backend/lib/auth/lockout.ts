import { queryOne, query } from "../db";

// REQ-098: login lockout without a read-then-write race.
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

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

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
