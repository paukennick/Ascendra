// REQ-108: one step of an objective's review schedule for a graded answer,
// and its review_log row. Moved out of lib/review-store.ts (REQ-112) so the
// grader can use it for exam answers (lib/grading-service.ts) without an
// import cycle; review-store re-uses it unchanged.
import type { TxClient } from "@/lib/db";
import { schedulerFor, utcDay, type ScheduleState } from "@/lib/review-scheduler";

export async function stepSchedule(
  tx: TxClient,
  userId: string,
  objectiveId: string,
  attemptId: string,
  verdict: "correct" | "partial" | "incorrect",
  assisted: boolean,
  now: Date
): Promise<{ wasDue: boolean | null; advanced: boolean; nextDueOn: string | null }> {
  const row = await tx.queryOne<{
    scheduler: string;
    step: number;
    due_on: string;
    reps: number;
    lapses: number;
    last_reviewed_at: Date | null;
    enrolled_at: Date;
  }>(
    `select scheduler, step, to_char(due_on, 'YYYY-MM-DD') as due_on, reps, lapses, last_reviewed_at, enrolled_at
       from review_schedule where user_id = $1 and objective_id = $2 for update`,
    [userId, objectiveId]
  );
  if (!row) {
    // Not enrolled (never reached Guided): the answer is logged, nothing to step.
    await tx.query(
      `insert into review_log (user_id, objective_id, attempt_id, verdict, assisted, was_due) values ($1, $2, $3, $4, $5, true)`,
      [userId, objectiveId, attemptId, verdict, assisted]
    );
    return { wasDue: null, advanced: false, nextDueOn: null };
  }
  const scheduler = schedulerFor(row.scheduler);
  const state: ScheduleState = {
    step: row.step,
    dueOn: row.due_on,
    reps: row.reps,
    lapses: row.lapses,
    lastReviewedAt: row.last_reviewed_at ? new Date(row.last_reviewed_at) : null,
    enrolledAt: new Date(row.enrolled_at),
  };
  const r = scheduler.next(state, { verdict, assisted, reviewedAt: now });
  await tx.query(
    `update review_schedule set step = $3, due_on = $4::date, reps = $5, lapses = $6, last_reviewed_at = $7,
            scheduler = $8, updated_at = now()
      where user_id = $1 and objective_id = $2`,
    [userId, objectiveId, r.next.step, r.next.dueOn, r.next.reps, r.next.lapses, r.next.lastReviewedAt, scheduler.name]
  );
  await tx.query(
    `insert into review_log (user_id, objective_id, attempt_id, reviewed_at, verdict, assisted, was_due, elapsed_days,
                             scheduled_days, scheduler, step_before, step_after, due_before, due_after)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::date, $14::date)`,
    [
      userId,
      objectiveId,
      attemptId,
      now,
      verdict,
      assisted,
      r.wasDue,
      r.elapsedDays,
      r.scheduledDays,
      scheduler.name,
      state.step,
      r.next.step,
      state.dueOn,
      r.next.dueOn,
    ]
  );
  return { wasDue: r.wasDue, advanced: r.advanced, nextDueOn: r.next.dueOn };
}

// REQ-112 (d): a correct, unassisted, spaced exam answer counts as a review
// when one is due -- the same step a review answer takes. Anything else (not
// enrolled, not due yet) changes and logs nothing, so a sprint never writes
// review_log rows that are not reviews. Callers decide "correct, unassisted,
// spaced" (attempt_spaced, migration 041).
export async function advanceDueSchedule(
  tx: TxClient,
  userId: string,
  objectiveId: string,
  attemptId: string,
  now: Date,
  verdict: "correct" | "partial" | "incorrect" = "correct"
): Promise<boolean> {
  const due = await tx.queryOne<{ ok: boolean }>(
    `select due_on <= $3::date as ok from review_schedule where user_id = $1 and objective_id = $2`,
    [userId, objectiveId, utcDay(now)]
  );
  if (!due?.ok) return false;
  // REQ-117: a miss when due is logged and steps back like a review miss.
  const r = await stepSchedule(tx, userId, objectiveId, attemptId, verdict, false, now);
  return r.advanced;
}
