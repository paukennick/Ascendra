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
] as const;

export type LearnerEvent = (typeof LEARNER_EVENTS)[number];

type Run = (sql: string, params: unknown[]) => Promise<unknown>;

// Once per (user, event, ref) / (user, objective) / first run, by the
// partial unique indexes; a repeat is ignored.
export async function recordEvent(
  userId: string,
  event: LearnerEvent,
  opts: { trackId?: string | null; objectiveId?: string | null; refId?: string | null } = {},
  run: Run = query
): Promise<void> {
  await run(
    `insert into learner_events (user_id, event, track_id, objective_id, ref_id)
     values ($1, $2, $3, $4, $5) on conflict do nothing`,
    [userId, event, opts.trackId ?? null, opts.objectiveId ?? null, opts.refId ?? null]
  );
}
