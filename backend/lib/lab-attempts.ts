import { query, queryOne } from "@/lib/db";

// REQ-096 ("labs step zero"): an objective's optional hands-on lab
// (objectives.lab_prompt) is shown after the solo check. The learner can say
// "I did it"; this records that as one attempt of kind 'lab'.
//
// What a lab attempt deliberately is NOT:
//   - graded: the app can't check a hands-on task, so verdict is null.
//   - mastery evidence: nothing here writes the mastery table, and null
//     verdicts are ignored by accuracyFromAttempts, so existing rows are safe.
//   - an error: nothing here writes error_log (spaced review), which
//     recordAttemptAndUpdateMastery does for every non-correct verdict --
//     this path therefore never calls it.

export const LAB_SELF_REPORT_ANSWER = "Marked as done (self-reported, not checked)";

// A double tap, a retry after a dropped connection, or a client that replays
// the request must not stack up rows. A learner who genuinely repeats the
// lab later still gets a new row.
export const LAB_DEDUPE_MINUTES = 10;

export interface LabObjective {
  id: string;
  unit_id: string;
  lab_prompt: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

type QueryOneFn = <T>(sql: string, params?: unknown[]) => Promise<T | null>;
type QueryFn = (sql: string, params?: unknown[]) => Promise<unknown[]>;

// The objective, only if it is in a track the caller can see (the shared
// catalog or their own) -- the same ownership rule as the mastery PUT
// (REQ-079), so the id can't be used to write against -- or read the lab of --
// someone else's track.
export async function findLabObjective(
  objectiveId: string,
  userId: string,
  run: QueryOneFn = queryOne as QueryOneFn
): Promise<LabObjective | null> {
  if (!isUuid(objectiveId)) return null;
  const row = await run<LabObjective>(
    `select o.id, o.unit_id, o.lab_prompt
       from objectives o
       join course_units cu on cu.id = o.unit_id
       join subject_tracks st on st.id = cu.track_id
      where o.id = $1 and (st.user_id is null or st.user_id = $2)`,
    [objectiveId, userId]
  );
  return row ?? null;
}

// Records one lab completion, or reports that one was just recorded.
// The question stored is the server's own lab_prompt, never client input.
// Parameters and literals are cast explicitly: in INSERT ... SELECT an
// untyped $n or string literal would be inferred as text and then fail
// against the uuid/enum columns.
export async function recordLabCompletion(
  userId: string,
  objective: LabObjective,
  run: QueryFn = query as QueryFn
): Promise<{ recorded: boolean }> {
  const prompt = objective.lab_prompt?.trim();
  if (!prompt) throw new Error("Objective has no lab prompt");

  const rows = await run(
    `insert into attempts
       (user_id, unit_id, objective_id, kind, stage, format, question, answer)
     select $1::uuid, $2::uuid, $3::uuid, 'lab'::attempt_kind, 'lab', 'lab'::attempt_format, $4::text, $5::text
      where not exists (
        select 1 from attempts
         where user_id = $1::uuid and objective_id = $3::uuid and kind = 'lab'
           and created_at > now() - make_interval(mins => $6::int)
      )
     returning id`,
    [userId, objective.unit_id, objective.id, prompt, LAB_SELF_REPORT_ANSWER, LAB_DEDUPE_MINUTES]
  );
  return { recorded: rows.length > 0 };
}
