// REQ-101: reads and writes of lesson_progress (migration 025) and its
// tombstones (migration 032), kept out of the route so the ordering rule can
// be tested against a real database.
//
// A delete records when it happened; a save whose savedAt is not after the
// last delete is ignored, so a save that was overtaken by the delete on the
// network cannot bring a finished lesson back. Saves and deletes for one
// user+objective take the same transaction-scoped advisory lock, so the
// check and the write cannot interleave with a delete.
import { withTransaction, type TxClient } from "./db";
import type { LessonProgressInput } from "./lesson-progress";

async function lockPosition(tx: TxClient, userId: string, objectiveId: string): Promise<void> {
  await tx.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`lesson_progress:${userId}:${objectiveId}`]);
}

// savedAt null (an app from before REQ-101) is saved unconditionally, as before.
export async function saveLessonProgress(
  userId: string,
  objectiveId: string,
  input: LessonProgressInput,
  savedAt: number | null
): Promise<{ saved: boolean }> {
  return withTransaction(async (tx) => {
    await lockPosition(tx, userId, objectiveId);
    if (savedAt !== null) {
      const stale = await tx.queryOne(
        `select 1 from lesson_progress_tombstones
          where user_id = $1 and objective_id = $2 and cleared_at >= to_timestamp($3::double precision / 1000)`,
        [userId, objectiveId, savedAt]
      );
      if (stale) return { saved: false };
    }
    await tx.query(
      `insert into lesson_progress
         (user_id, objective_id, step, guess, guess_feedback, confidence, lesson_key, checks, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8, now())
       on conflict (user_id, objective_id) do update set
         step = excluded.step, guess = excluded.guess, guess_feedback = excluded.guess_feedback,
         confidence = excluded.confidence, lesson_key = excluded.lesson_key,
         checks = excluded.checks, updated_at = now()`,
      [
        userId,
        objectiveId,
        input.step,
        input.guess,
        input.guessFeedback,
        input.confidence,
        input.lessonKey,
        JSON.stringify(input.checks),
      ]
    );
    return { saved: true };
  });
}

// clearedAt null (an older app) records the server's time instead. A later
// delete never moves the tombstone backwards.
export async function clearLessonProgressAt(userId: string, objectiveId: string, clearedAt: number | null): Promise<void> {
  await withTransaction(async (tx) => {
    await lockPosition(tx, userId, objectiveId);
    await tx.query(`delete from lesson_progress where user_id = $1 and objective_id = $2`, [userId, objectiveId]);
    await tx.query(
      `insert into lesson_progress_tombstones (user_id, objective_id, cleared_at)
       select $1, $2, coalesce(to_timestamp($3::double precision / 1000), now())
        where exists (select 1 from objectives where id = $2)
       on conflict (user_id, objective_id) do update
         set cleared_at = greatest(lesson_progress_tombstones.cleared_at, excluded.cleared_at)`,
      [userId, objectiveId, clearedAt]
    );
  });
}
