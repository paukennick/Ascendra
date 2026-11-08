import { query, queryOne } from "@/lib/db";
import { featureLock } from "@/lib/entitlements";
import { LABS_FEATURE, listLabs } from "@/lib/labs";
import { coachContextForObjective } from "@/lib/coach-context";
import { labSafetyFamily } from "@/lib/lab-grading";
import { labDisclaimerFor, type LabDisclaimer } from "@/lib/lab-disclaimer";

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

  // Merged 2026-11-07: a kind 'lab' attempt keeps its objective in
  // lab_objective_id with objective_id null (line A's 035 check
  // attempts_lab_not_mastery_evidence), so it can never be read as mastery
  // evidence. format 'lab' (migration 053) tells this self-report apart from
  // a lab report (lib/lesson-experience.ts latestLabReport skips it).
  const rows = await run(
    `insert into attempts
       (user_id, unit_id, lab_objective_id, kind, stage, format, question, answer)
     select $1::uuid, $2::uuid, $3::uuid, 'lab'::attempt_kind, 'lab', 'lab'::attempt_format, $4::text, $5::text
      where not exists (
        select 1 from attempts
         where user_id = $1::uuid and lab_objective_id = $3::uuid and kind = 'lab' and format::text = 'lab'
           and created_at > now() - make_interval(mins => $6::int)
      )
     returning id`,
    [userId, objective.unit_id, objective.id, prompt, LAB_SELF_REPORT_ANSWER, LAB_DEDUPE_MINUTES]
  );
  return { recorded: rows.length > 0 };
}

// Merged 2026-11-07: the Try it step (REQ-096) shows the same
// objectives.lab_prompt as line A's lab card (REQ-106), so it follows A's
// rules for showing a lab. Null -- no Try it step -- when the objective has
// no prompt or the caller can't see it, when the learner's plan has no labs
// (REQ-122 featureLock; never locked while BILLING_ENABLED is off), or when
// the lab's family (clinical / fitness) needs the one-time disclaimer
// acknowledgement and the learner hasn't given it yet (REQ-125): the lab
// card on the Done screen asks for it. Otherwise the prompt and the
// disclaimer the app shows with it.
export interface TryItLab {
  prompt: string;
  disclaimer: LabDisclaimer;
}

//
// REQ-139 (FAIL-526): the lesson offered the same lab twice -- Try it after
// Solo and the lab card on the Done screen. Try it is now offered only when
// the objective has no lab the learner can see (objectiveHasLab). The lab
// card shows this same prompt under the same plan rule, so while both read
// objectives.lab_prompt the card wins wherever a prompt exists, and the
// self-report route (POST /api/objectives/:id/lab, also gated here) refuses.
export async function tryItLab(userId: string, objectiveId: string): Promise<TryItLab | null> {
  const objective = await findLabObjective(objectiveId, userId);
  const prompt = objective?.lab_prompt?.trim();
  if (!objective || !prompt) return null;
  if (await featureLock(userId, LABS_FEATURE)) return null;
  if (await objectiveHasLab(userId, objective)) return null;
  const disclaimer = await labDisclaimerFor(userId, labSafetyFamily(await coachContextForObjective(objective.id)), null);
  if (disclaimer.acknowledgement.required && !disclaimer.acknowledgement.acknowledged) return null;
  return { prompt, disclaimer };
}

// REQ-139: does the learner see a lab for this objective elsewhere in the
// app? Either the Done screen's lab card -- the objective's lab_prompt on a
// plan with labs, exactly what GET /api/objectives/:id/lab returns as `lab`
// -- or a build or case lab (REQ-123) on the objective, listed by
// GET /api/labs?objectiveId= (locked ones included: they are listed too).
// The caller has already checked the objective is visible to this learner.
export async function objectiveHasLab(userId: string, objective: LabObjective): Promise<boolean> {
  if (objective.lab_prompt?.trim() && !(await featureLock(userId, LABS_FEATURE))) return true;
  return (await listLabs(userId, { objectiveId: objective.id })).length > 0;
}

// The lesson GET's fields: `labPrompt` (B's contract) and `labDisclaimer`.
export function tryItFields(lab: TryItLab | null): { labPrompt: string | null; labDisclaimer: LabDisclaimer | null } {
  return { labPrompt: lab?.prompt ?? null, labDisclaimer: lab?.disclaimer ?? null };
}
