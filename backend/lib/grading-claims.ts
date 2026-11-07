import { randomUUID } from "node:crypto";
import { query, queryOne } from "@/lib/db";

// REQ-117 (Audit 3 A9, FAIL-359): one submission, one model call.
//
// The replay check (findClientAttempt) runs before grading, so copies of one
// submission sent at once -- a double tap, a flaky network resending -- all
// passed it and each called the model: 60 copies of one clientAttemptId cost
// 40 model calls for 1 stored attempt. Now the first copy takes a claim on
// (learner, clientAttemptId) in grading_claims (migration 045) before the
// model call; the others wait for its stored result and replay it, without
// billing. A claim is released when grading ends, success or failure, and a
// claim older than CLAIM_EXPIRY_SECONDS (a process that died mid-grade) is
// taken over. No database connection is held while the model runs.

export const CLAIM_EXPIRY_SECONDS = 120;
export const CLAIM_WAIT_MS = 30_000;
export const CLAIM_POLL_MS = 200;

export class GradingInProgressError extends Error {
  constructor() {
    super("This answer is still being graded. Try again in a moment.");
    this.name = "GradingInProgressError";
  }
}

async function takeClaim(userId: string, clientAttemptId: string): Promise<string | null> {
  const token = randomUUID();
  const row = await queryOne<{ token: string }>(
    `insert into grading_claims (user_id, client_attempt_id, token) values ($1, $2, $3)
     on conflict (user_id, client_attempt_id) do update set token = excluded.token, claimed_at = now()
       where grading_claims.claimed_at < now() - make_interval(secs => $4)
     returning token`,
    [userId, clientAttemptId, token, CLAIM_EXPIRY_SECONDS]
  );
  return row?.token === token ? token : null;
}

async function releaseClaim(userId: string, clientAttemptId: string, token: string): Promise<void> {
  await query(`delete from grading_claims where user_id = $1 and client_attempt_id = $2 and token = $3`, [
    userId,
    clientAttemptId,
    token,
  ]);
}

// Runs `grade` for the copy that holds the claim. Every other copy polls
// `replay` (the route's own stored-result check: null while nothing is
// stored) until it returns something, and returns that. If the holder ends
// without storing anything (its model call failed), a waiter takes the claim
// and grades itself. Without a clientAttemptId there is nothing to share.
export async function withGradingClaim<T>(
  userId: string,
  clientAttemptId: string | null,
  grade: () => Promise<T>,
  replay: () => Promise<T | null>,
  opts: { waitMs?: number; pollMs?: number } = {}
): Promise<T> {
  if (!clientAttemptId) return grade();
  const deadline = Date.now() + (opts.waitMs ?? CLAIM_WAIT_MS);
  for (;;) {
    const token = await takeClaim(userId, clientAttemptId);
    if (token) {
      try {
        // A copy that finished between our replay check and the claim.
        const done = await replay();
        if (done !== null) return done;
        return await grade();
      } finally {
        await releaseClaim(userId, clientAttemptId, token).catch(() => undefined);
      }
    }
    const done = await replay();
    if (done !== null) return done;
    if (Date.now() >= deadline) throw new GradingInProgressError();
    await new Promise((r) => setTimeout(r, opts.pollMs ?? CLAIM_POLL_MS));
  }
}
