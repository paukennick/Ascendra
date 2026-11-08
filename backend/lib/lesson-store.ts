import { lessonServableSql } from "@/lib/item-quality";
import { query, queryOne } from "./db";
import type { LessonIntroContent, LessonPracticeContent } from "./prompts";

// Storage for lesson text (migration 027c). Pure database access -- nothing
// here calls the model -- so the selection and claim rules can be tested
// against a real Postgres (lib/lesson-regen.dbtest.ts).
//
//   lesson_content            one SHARED lesson per objective, filled by the
//                             first visit to the objective, served to everyone
//   lesson_content_overrides  one row per (learner, objective), written only by
//                             that learner's "Regenerate lesson"
//   lesson_generation_claims  short-lived leases so only one server instance
//                             generates a given lesson at a time

export interface LessonRow {
  guess_prompt: string;
  teach: string;
  fade_problem: string;
  fade_choices: string[];
  fade_correct_index: number;
  fade_why: string;
  solo_check: string;
  solo_choices: string[];
  solo_correct_index: number;
  solo_why: string;
  // REQ-105 (migration 034): one reason per stored choice, same order. Null
  // for lessons cached before it; grading falls back to *_why. Never sent in
  // the lesson payload.
  fade_option_reasons: string[] | null;
  solo_option_reasons: string[] | null;
  // REQ-106 (migration 035): Teach as short cards plus one self-explanation
  // prompt. Null for lessons cached before it; they keep their flat `teach`.
  teach_cards: unknown | null;
  model: string;
  generated_at: string;
}

export type LessonContent = LessonIntroContent & LessonPracticeContent;

// Reasons are stored only when there is exactly one string per choice; a
// partial list could pair a reason with the wrong option.
export function optionReasonsFor(reasons: unknown, choices: unknown): string[] | null {
  if (!Array.isArray(reasons) || !Array.isArray(choices) || reasons.length !== choices.length) return null;
  if (!reasons.every((r) => typeof r === "string" && r.trim())) return null;
  return reasons as string[];
}

export type LessonScope = { kind: "shared" } | { kind: "user"; userId: string };

export const SHARED: LessonScope = { kind: "shared" };

// Stable string for a scope: the claim table's `scope` column and the
// in-memory map key.
export function scopeKey(scope: LessonScope): string {
  // REQ-135: lowercased; the claim row's scope is a string, not a uuid.
  return scope.kind === "shared" ? "shared" : `user:${scope.userId.toLowerCase()}`;
}

// A claim older than this is treated as abandoned (its instance crashed or
// was frozen mid-generation) and may be taken over. A full generation takes
// about 20s, so this is generous without letting a dead claim block an
// objective for long.
export const CLAIM_LEASE_SECONDS = 120;

const LESSON_COLUMNS = `guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
  solo_check, solo_choices, solo_correct_index, solo_why, fade_option_reasons, solo_option_reasons, teach_cards, model, generated_at`;

export type LessonSource = "override" | "shared";

// What `userId` should be served for an objective: their own regenerated
// lesson if they have one, otherwise the shared lesson, otherwise null.
// REQ-114: a lesson whose Guided or Solo check is pulled from rotation
// (item_status) is never served or graded against; with none left, the
// caller generates a replacement (saveLesson below replaces a pulled shared
// lesson).
export async function getLessonFor(
  userId: string,
  objectiveId: string
): Promise<{ row: LessonRow; source: LessonSource } | null> {
  const row = await queryOne<LessonRow & { source: LessonSource }>(
    `select * from (
       select 1 as pri, 'override' as source, ${LESSON_COLUMNS}
         from lesson_content_overrides lo where user_id = $1 and objective_id = $2 and ${lessonServableSql("lo")}
       union all
       select 2 as pri, 'shared' as source, ${LESSON_COLUMNS}
         from lesson_content lc where objective_id = $2 and ${lessonServableSql("lc")}
     ) t order by pri limit 1`,
    [userId, objectiveId]
  );
  if (!row) return null;
  const { source, ...lesson } = row;
  return { row: lesson as LessonRow, source };
}

export async function getSharedLesson(objectiveId: string): Promise<LessonRow | null> {
  return queryOne<LessonRow>(`select ${LESSON_COLUMNS} from lesson_content where objective_id = $1`, [objectiveId]);
}

// The shared lesson only if it can be served (REQ-114): what generation
// checks before and after taking the lease, so a pulled lesson is replaced.
export async function getServableSharedLesson(objectiveId: string): Promise<LessonRow | null> {
  return queryOne<LessonRow>(
    `select ${LESSON_COLUMNS} from lesson_content lc where objective_id = $1 and ${lessonServableSql("lc")}`,
    [objectiveId]
  );
}

export async function getOverrideLesson(userId: string, objectiveId: string): Promise<LessonRow | null> {
  return queryOne<LessonRow>(
    `select ${LESSON_COLUMNS} from lesson_content_overrides where user_id = $1 and objective_id = $2`,
    [userId, objectiveId]
  );
}

function contentParams(content: LessonContent, model: string): unknown[] {
  return [
    content.guessPrompt,
    content.teach,
    content.fadeProblem,
    JSON.stringify(content.fadeChoices),
    content.fadeCorrectIndex,
    content.fadeWhy,
    content.soloCheck,
    JSON.stringify(content.soloChoices),
    content.soloCorrectIndex,
    content.soloWhy,
    jsonOrNull(optionReasonsFor(content.fadeOptionReasons, content.fadeChoices)),
    jsonOrNull(optionReasonsFor(content.soloOptionReasons, content.soloChoices)),
    jsonOrNull(content.teachCards ?? null),
    model,
  ];
}

function jsonOrNull(v: unknown): string | null {
  return v == null ? null : JSON.stringify(v);
}

// Persists a finished lesson and returns the row that is now stored.
//
// shared: insert-if-absent. A first generation never replaces an existing
//   shared lesson (that is what made "regenerate" affect everyone); if a row
//   is already there, that row wins and is returned. REQ-114: the one
//   exception is a shared lesson with a check pulled from rotation, which the
//   new generation replaces. Learners' saved places in it stop matching its
//   lesson_key, so the app starts them on the new lesson.
// user: upsert of that learner's override only. lesson_content is never
//   written by this path.
export async function saveLesson(
  scope: LessonScope,
  objectiveId: string,
  content: LessonContent,
  model: string
): Promise<LessonRow> {
  const params = contentParams(content, model);
  if (scope.kind === "shared") {
    const rows = await query<LessonRow>(
      `insert into lesson_content
        (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
         solo_check, solo_choices, solo_correct_index, solo_why, fade_option_reasons, solo_option_reasons, teach_cards, model)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       on conflict (objective_id) do update set
         guess_prompt = excluded.guess_prompt, teach = excluded.teach,
         fade_problem = excluded.fade_problem, fade_choices = excluded.fade_choices,
         fade_correct_index = excluded.fade_correct_index, fade_why = excluded.fade_why,
         solo_check = excluded.solo_check, solo_choices = excluded.solo_choices,
         solo_correct_index = excluded.solo_correct_index, solo_why = excluded.solo_why,
         fade_option_reasons = excluded.fade_option_reasons, solo_option_reasons = excluded.solo_option_reasons,
         teach_cards = excluded.teach_cards, model = excluded.model, generated_at = now()
       where not (${lessonServableSql("lesson_content")})
       returning ${LESSON_COLUMNS}`,
      [objectiveId, ...params]
    );
    if (rows[0]) return rows[0];
    const existing = await getSharedLesson(objectiveId);
    if (!existing) throw new Error("Shared lesson insert conflicted but no row was found");
    return existing;
  }
  const rows = await query<LessonRow>(
    `insert into lesson_content_overrides
      (user_id, objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
       solo_check, solo_choices, solo_correct_index, solo_why, fade_option_reasons, solo_option_reasons, teach_cards, model)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     on conflict (user_id, objective_id) do update set
       guess_prompt = excluded.guess_prompt,
       teach = excluded.teach,
       fade_problem = excluded.fade_problem,
       fade_choices = excluded.fade_choices,
       fade_correct_index = excluded.fade_correct_index,
       fade_why = excluded.fade_why,
       solo_check = excluded.solo_check,
       solo_choices = excluded.solo_choices,
       solo_correct_index = excluded.solo_correct_index,
       solo_why = excluded.solo_why,
       fade_option_reasons = excluded.fade_option_reasons,
       solo_option_reasons = excluded.solo_option_reasons,
       teach_cards = excluded.teach_cards,
       model = excluded.model,
       generated_at = now()
     returning ${LESSON_COLUMNS}`,
    [scope.userId, objectiveId, ...params]
  );
  return rows[0];
}

// Takes the generation lease for (objective, scope) if nobody holds a live
// one. One atomic statement: the insert wins if there is no claim; on
// conflict the existing claim is taken over only if it is past its lease.
// Returns whether the caller now holds the lease.
export async function tryClaim(objectiveId: string, scope: LessonScope, token: string): Promise<boolean> {
  const rows = await query(
    `insert into lesson_generation_claims (objective_id, scope, claim_token, claimed_at)
     values ($1, $2, $3, now())
     on conflict (objective_id, scope) do update
       set claim_token = excluded.claim_token, claimed_at = now()
       where lesson_generation_claims.claimed_at < now() - make_interval(secs => $4::double precision)
     returning claim_token`,
    [objectiveId, scopeKey(scope), token, CLAIM_LEASE_SECONDS]
  );
  return rows.length > 0;
}

// REQ-135: heartbeat. The holder pushes its lease forward while it is still
// generating, so a slow generation (model retries, a slow API) is not taken
// over at CLAIM_LEASE_SECONDS by a second instance while the first is alive.
// Only the holder's own token renews; false means the lease was lost (this
// instance stalled past the lease and someone else took over).
export async function renewClaim(objectiveId: string, scope: LessonScope, token: string): Promise<boolean> {
  const rows = await query(
    `update lesson_generation_claims set claimed_at = now()
      where objective_id = $1 and scope = $2 and claim_token = $3
      returning 1`,
    [objectiveId, scopeKey(scope), token]
  );
  return rows.length > 0;
}

// Only the holder's own token releases, so an instance that was taken over
// after going stale cannot delete its successor's lease.
export async function releaseClaim(objectiveId: string, scope: LessonScope, token: string): Promise<void> {
  await query(`delete from lesson_generation_claims where objective_id = $1 and scope = $2 and claim_token = $3`, [
    objectiveId,
    scopeKey(scope),
    token,
  ]);
}

export async function isClaimLive(objectiveId: string, scope: LessonScope): Promise<boolean> {
  const row = await queryOne(
    `select 1 from lesson_generation_claims
      where objective_id = $1 and scope = $2
        and claimed_at >= now() - make_interval(secs => $3::double precision)`,
    [objectiveId, scopeKey(scope), CLAIM_LEASE_SECONDS]
  );
  return row !== null;
}

// The learner's saved place in the old lesson. Its lesson_key no longer
// matches once they regenerate, so the app would discard it anyway; deleting
// it keeps the account copy honest. Only ever the caller's own row.
export async function clearLessonProgress(userId: string, objectiveId: string): Promise<void> {
  await query(`delete from lesson_progress where user_id = $1 and objective_id = $2`, [userId, objectiveId]);
}
