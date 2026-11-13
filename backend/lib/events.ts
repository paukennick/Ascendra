import { query } from "@/lib/db";

// REQ-119 (Audit 3 product M8): first-party learning milestones in
// learner_events (migration 048). Minimal on purpose: the user id, the event
// name, course / objective / session ids and a time. Never answer text, never
// anything else about the person, never sent to a third party. Deleted with
// the account; part of the account export.
//
// Most events are written by database triggers at the state change that
// defines them (048): lesson_started (first lesson answer or saved position),
// lesson_finished (first Solo answer), review_done (a review session finished
// with at least one answer), exam_taken (a sprint or mock submitted),
// placement_done (a placement check finished). The routes for first run and
// exam outcomes record theirs through recordEvent below.

export const LEARNER_EVENTS = [
  "lesson_started",
  "lesson_finished",
  "review_done",
  "exam_taken",
  "placement_done",
  "first_run_completed",
  "exam_outcome",
  // REQ-252 (migration 078): the per-course goal answer, level changes and
  // the phase 1 lesson-step events (lib/learner-level-rules.ts LESSON_EVENTS),
  // each with a small `detail` built from fixed keys -- never answer text.
  "course_goal_set",
  "level_changed",
  "guess_shown",
  "guess_answered",
  "guess_skipped",
  "teach_card_viewed",
  "guided_skipped",
  "lesson_step_reached",
  "key_terms_opened",
  "key_terms_closed",
] as const;

export type LearnerEvent = (typeof LEARNER_EVENTS)[number];

type Run = (sql: string, params: unknown[]) => Promise<unknown>;

// Once per (user, event, ref) / (user, objective) / first run, by the
// partial unique indexes; a repeat is ignored.
export async function recordEvent(
  userId: string,
  event: LearnerEvent,
  opts: {
    trackId?: string | null;
    objectiveId?: string | null;
    refId?: string | null;
    // REQ-252: only ever built by the server from fixed keys (no learner text).
    detail?: Record<string, string | number | boolean> | null;
  } = {},
  run: Run = query
): Promise<void> {
  const detail = opts.detail && Object.keys(opts.detail).length ? JSON.stringify(opts.detail) : null;
  const params = [userId, event, opts.trackId ?? null, opts.objectiveId ?? null, opts.refId ?? null];
  // The detail column (078) is named only when there is a detail, so the
  // events written before 078 keep working on a database without it.
  if (detail === null) {
    await run(
      `insert into learner_events (user_id, event, track_id, objective_id, ref_id)
       values ($1, $2, $3, $4, $5) on conflict do nothing`,
      params
    );
    return;
  }
  await run(
    `insert into learner_events (user_id, event, track_id, objective_id, ref_id, detail)
     values ($1, $2, $3, $4, $5, $6::jsonb) on conflict do nothing`,
    [...params, detail]
  );
}
