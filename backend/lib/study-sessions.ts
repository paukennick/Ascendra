import { withTransaction } from "@/lib/db";

// The app calls POST /api/sessions every time a course screen opens, so a
// day of tabbing around piled up dozens of near-identical rows. A visit
// within this window of the learner's open session on the same track is the
// same sitting.
export const SESSION_WINDOW_MINUTES = 30;

// Starts a session on the track, or -- when the caller already has an open
// (not ended) one on it that started within the window -- moves that one's
// started_at to now and returns it. started_at is what "Continue studying"
// and Recent order by (courses.last_studied_at is max(started_at)), so
// touching it keeps that recency honest. Two visits at once are serialised
// by an advisory lock, so they can't both insert.
export async function startOrTouchSession(userId: string, trackId: string) {
  return withTransaction(async (tx) => {
    await tx.query(`select pg_advisory_xact_lock(hashtext($1))`, [`session:${userId}:${trackId}`]);
    const touched = await tx.queryOne<Record<string, unknown>>(
      `update study_sessions set started_at = now()
        where id = (
          select id from study_sessions
           where user_id = $1 and track_id = $2 and ended_at is null
             and started_at > now() - make_interval(mins => $3)
           order by started_at desc limit 1
        )
        returning *`,
      [userId, trackId, SESSION_WINDOW_MINUTES]
    );
    if (touched) return { session: touched, created: false };
    const inserted = await tx.queryOne<Record<string, unknown>>(
      `insert into study_sessions (user_id, track_id) values ($1,$2) returning *`,
      [userId, trackId]
    );
    return { session: inserted!, created: true };
  });
}
