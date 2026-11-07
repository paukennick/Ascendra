import { servableSql } from "@/lib/item-quality";
import { isActive } from "@/lib/progress-sql";
import { query, queryOne, withTransaction, type TxClient } from "@/lib/db";
import { recordAttemptTx, type AssistReason } from "@/lib/grading-service";
import { utcDay } from "@/lib/review-scheduler";
import { stepSchedule } from "@/lib/review-step";
import {
  md5,
  planSession,
  termKey,
  termsFromTitle,
  type DueCandidate,
  type LastSession,
} from "@/lib/review-plan";

// REQ-108: database side of the review loop (migration 037). Nothing here
// calls the model; lib/review-service.ts does that and calls in here.
// Tested against a real Postgres in lib/review-loop.dbtest.ts.

type Q = (text: string, params?: unknown[]) => Promise<Record<string, any>[]>;

// ---------------------------------------------------------------------------
// Due objectives
// ---------------------------------------------------------------------------

export interface DueRow extends DueCandidate {
  title: string;
  unitTitle: string;
  trackId: string;
  trackTitle: string;
}

// Objectives due for review today: their schedule date has come, or a missed
// question on them is due (error_log, the older 1/7/21 queue -- folded in so
// a miss is re-checked with a real answer, not a "Got it" tap). Only courses
// the learner can see and has accepted the disclaimer for; objectives already
// answered in a review today are left for another day.
export async function dueObjectives(userId: string, today: string, trackId: string | null, q: Q = query): Promise<DueRow[]> {
  const rows = await q(
    `with sched as (
       select objective_id, due_on, step, lapses from review_schedule
        where user_id = $1 and due_on <= $2::date
     ), err as (
       -- REQ-117 (T9, T14): only for objectives with no schedule. Once an
       -- objective is scheduled, a miss already steps its schedule back; the
       -- error_log entry re-asking it as well brought a missed 60-day item
       -- back onto the 60-day gap within three weeks, and made the plan
       -- count one item per miss instead of one per objective.
       select e.objective_id, min(e.next_review_at) as due_on from error_log e
        where e.user_id = $1 and not e.resolved and e.objective_id is not null and e.next_review_at <= $2::date
          and not exists (select 1 from review_schedule rs where rs.user_id = $1 and rs.objective_id = e.objective_id)
        group by e.objective_id
     ), due as (
       select coalesce(s.objective_id, e.objective_id) as objective_id,
              least(s.due_on, e.due_on) as due_on,
              coalesce(s.step, -1) as step, coalesce(s.lapses, 0) as lapses
         from sched s full join err e on e.objective_id = s.objective_id
     )
     select d.objective_id, to_char(d.due_on, 'YYYY-MM-DD') as due_on, d.step, d.lapses,
            o.unit_id, o.title, cu.title as unit_title, cu.track_id, st.title as track_title,
            coalesce(m.score_0_4, 0) as mastery
       from due d
       join objectives o on o.id = d.objective_id
       join course_units cu on cu.id = o.unit_id
       join subject_tracks st on st.id = cu.track_id
       left join mastery m on m.user_id = $1 and m.objective_id = d.objective_id
      where (st.user_id is null or st.user_id = $1)
        and ($3::uuid is null or cu.track_id = $3::uuid)
        and ${isActive("o")} and ${isActive("cu")}
        and (not coalesce(st.requires_acknowledgement, false)
             or exists (select 1 from track_acknowledgements ta
                         where ta.user_id = $1 and ta.track_id = st.id and ta.disclaimer_version = st.disclaimer_version))
        and not exists (
          select 1 from review_session_items si join review_sessions s on s.id = si.session_id
           where s.user_id = $1 and si.objective_id = d.objective_id
             and (si.answered_at at time zone 'UTC')::date = $2::date)`,
    [userId, today, trackId]
  );
  return rows.map((r) => ({
    objectiveId: r.objective_id,
    unitId: r.unit_id,
    dueOn: r.due_on,
    step: Number(r.step),
    lapses: Number(r.lapses),
    mastery: Number(r.mastery),
    title: r.title,
    unitTitle: r.unit_title,
    trackId: r.track_id,
    trackTitle: r.track_title,
  }));
}

// REQ-117 (Audit 3 T10, FAIL-349): objectives whose last two graded answers
// (any setting the weighted model counts, never a retry) were both missed.
// The review session opens them with a short re-teach and the choices shown
// (an easier, recognition-first entry) instead of a third cold miss.
export const STRUGGLE_MISSES = 2;
export async function strugglingObjectives(userId: string, objectiveIds: string[], q: Q = query): Promise<Set<string>> {
  if (!objectiveIds.length) return new Set();
  const rows = await q(
    `select x.objective_id from (
       select a.objective_id, a.verdict,
              row_number() over (partition by a.objective_id order by a.created_at desc, a.id desc) as rn
         from attempts a
         join assessment_types ty on ty.type_name = attempt_type_of(a.kind, a.stage, a.format, a.assessment_type)
        where a.user_id = $1 and a.objective_id = any($2::uuid[]) and a.verdict is not null and a.format <> 'pbq' and a.voided_at is null
          and (a.kind = 'lesson' or a.assessment_type is not null)
          and ty.cognitive_weight > 0 and a.assist_reason is distinct from 'retry'
     ) x
     where x.rn <= $3
     group by x.objective_id
     having count(*) = $3 and bool_and(x.verdict <> 'correct')`,
    [userId, objectiveIds, STRUGGLE_MISSES]
  );
  return new Set(rows.map((r) => r.objective_id as string));
}

// The learner's most recent review session with answers, for the
// gentle-start rule (lib/review-plan.ts).
export async function lastSessionStats(userId: string, q: Q = query): Promise<LastSession | null> {
  const r = await q(
    `select count(si.answered_at) as answered, count(*) filter (where si.verdict = 'correct') as correct
       from review_sessions s join review_session_items si on si.session_id = s.id
      where s.id = (select s2.id from review_sessions s2
                     where s2.user_id = $1
                       and exists (select 1 from review_session_items x where x.session_id = s2.id and x.answered_at is not null)
                     order by s2.created_at desc limit 1)`,
    [userId]
  );
  const row = r[0];
  if (!row || !Number(row.answered)) return null;
  return { answered: Number(row.answered), correct: Number(row.correct) };
}

export async function nextDueOn(userId: string, trackId: string | null): Promise<string | null> {
  const r = await queryOne<{ d: string | null }>(
    `select to_char(min(rs.due_on), 'YYYY-MM-DD') as d
       from review_schedule rs join objectives o on o.id = rs.objective_id
       join course_units cu on cu.id = o.unit_id
      where rs.user_id = $1 and ($2::uuid is null or cu.track_id = $2::uuid)
        and ${isActive("o")} and ${isActive("cu")}`,
    [userId, trackId]
  );
  return r?.d ?? null;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export interface SessionItemRow {
  position: number;
  objective_id: string;
  review_item_id: string | null;
  choices_shown_at: string | null;
  attempt_id: string | null;
  verdict: "correct" | "partial" | "incorrect" | null;
  answered_at: string | null;
  objective_title: string;
  unit_id: string;
  unit_title: string;
  track_id: string;
  track_title: string;
  question: string | null;
  terms: string[] | null;
}

export async function openSession(userId: string, sessionId: string) {
  return queryOne<{ id: string; user_id: string; track_id: string | null; day: string; gentle_start: boolean; size_cap: number; finished_at: string | null }>(
    `select id, user_id, track_id, to_char(day, 'YYYY-MM-DD') as day, gentle_start, size_cap, finished_at
       from review_sessions where id = $1 and user_id = $2`,
    [sessionId, userId]
  );
}

export async function sessionItems(sessionId: string): Promise<SessionItemRow[]> {
  return query<SessionItemRow & Record<string, unknown>>(
    `select si.position, si.objective_id, si.review_item_id, si.choices_shown_at, si.attempt_id, si.verdict, si.answered_at,
            o.title as objective_title, o.unit_id, cu.title as unit_title, cu.track_id, st.title as track_title,
            ri.question, ri.terms
       from review_session_items si
       join objectives o on o.id = si.objective_id
       join course_units cu on cu.id = o.unit_id
       join subject_tracks st on st.id = cu.track_id
       left join review_items ri on ri.id = si.review_item_id
      where si.session_id = $1
      order by si.position`,
    [sessionId]
  );
}

// Today's open session for this scope that still has unanswered questions,
// or a new one planned from what is due. Serialised per learner so a double
// tap or two devices get the same session. Earlier days' unfinished sessions
// are closed (their unanswered objectives stay due). Returns null when
// nothing is due.
export async function startOrResumeSession(
  userId: string,
  trackId: string | null,
  now: Date = new Date()
): Promise<{ id: string; resumed: boolean } | null> {
  const today = utcDay(now);
  return withTransaction(async (tx) => {
    await tx.query(`select pg_advisory_xact_lock(hashtext($1))`, [`review-session:${userId}`]);
    await tx.query(
      `update review_sessions set finished_at = now()
        where user_id = $1 and finished_at is null and day < $2::date`,
      [userId, today]
    );
    const open = await tx.queryOne<{ id: string }>(
      `select s.id from review_sessions s
        where s.user_id = $1 and s.day = $2::date and s.finished_at is null
          and s.track_id is not distinct from $3::uuid
          and exists (select 1 from review_session_items si where si.session_id = s.id and si.answered_at is null)
        order by s.created_at desc limit 1`,
      [userId, today, trackId]
    );
    if (open) return { id: open.id, resumed: true };

    const due = await dueObjectives(userId, today, trackId, (t, p) => tx.query(t, p));
    if (!due.length) return null;
    const plan = planSession(due, await lastSessionStats(userId, (t, p) => tx.query(t, p)));
    const s = await tx.queryOne<{ id: string }>(
      `insert into review_sessions (user_id, track_id, day, size_cap, gentle_start) values ($1, $2, $3::date, $4, $5) returning id`,
      [userId, trackId, today, plan.cap, plan.gentleStart]
    );
    for (const [i, item] of plan.items.entries()) {
      await tx.query(`insert into review_session_items (session_id, position, objective_id) values ($1, $2, $3)`, [
        s!.id,
        i,
        item.objectiveId,
      ]);
    }
    return { id: s!.id, resumed: false };
  });
}

// A question that could not be prepared (no shared lesson to write it from,
// or generation failed) is taken out of the session; its objective stays due.
export async function dropUnpreparedItems(sessionId: string): Promise<number> {
  const rows = await query(
    `delete from review_session_items where session_id = $1 and review_item_id is null and answered_at is null returning position`,
    [sessionId]
  );
  return rows.length;
}

export async function assignItem(sessionId: string, position: number, reviewItemId: string): Promise<void> {
  await query(
    `update review_session_items set review_item_id = $3
      where session_id = $1 and position = $2 and review_item_id is null`,
    [sessionId, position, reviewItemId]
  );
}

export async function recordChoicesShown(sessionId: string, position: number): Promise<void> {
  await query(
    `update review_session_items set choices_shown_at = coalesce(choices_shown_at, now())
      where session_id = $1 and position = $2 and answered_at is null`,
    [sessionId, position]
  );
}

export async function finishSession(userId: string, sessionId: string): Promise<boolean> {
  const r = await query(
    `update review_sessions set finished_at = coalesce(finished_at, now()) where id = $1 and user_id = $2 returning id`,
    [sessionId, userId]
  );
  return r.length > 0;
}

// ---------------------------------------------------------------------------
// Shared review questions
// ---------------------------------------------------------------------------

export interface ReviewItemRow {
  id: string;
  objective_id: string;
  source_hash: string;
  question: string;
  choices: string[];
  correct_index: number;
  why: string;
  terms: string[];
  generated_at: string;
}

// Cached questions for the objective, written from this teaching text, that
// this learner has not answered yet.
export async function unseenItems(userId: string, objectiveId: string, sourceHash: string): Promise<ReviewItemRow[]> {
  return query<ReviewItemRow & Record<string, unknown>>(
    `select ri.id, ri.objective_id, ri.source_hash, ri.question, ri.choices, ri.correct_index, ri.why, ri.terms,
            to_char(ri.generated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US') as generated_at
       from review_items ri
      where ri.objective_id = $2 and ri.source_hash = $3
        and ${servableSql("review", "ri.id")}
        and not exists (
          select 1 from review_session_items si join review_sessions s on s.id = si.session_id
           where s.user_id = $1 and si.review_item_id = ri.id and si.answered_at is not null)
      order by ri.generated_at, ri.id`,
    [userId, objectiveId, sourceHash]
  );
}

export async function insertReviewItem(item: {
  objectiveId: string;
  sourceHash: string;
  question: string;
  choices: string[];
  correctIndex: number;
  why: string;
  terms: string[];
  model: string;
}): Promise<string> {
  const r = await queryOne<{ id: string }>(
    `insert into review_items (objective_id, source_hash, question, choices, correct_index, why, terms, model)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [
      item.objectiveId,
      item.sourceHash,
      item.question,
      JSON.stringify(item.choices),
      item.correctIndex,
      item.why,
      JSON.stringify(item.terms),
      item.model,
    ]
  );
  return r!.id;
}

export async function getReviewItem(id: string): Promise<ReviewItemRow | null> {
  return queryOne<ReviewItemRow & Record<string, unknown>>(
    `select id, objective_id, source_hash, question, choices, correct_index, why, terms, generated_at::text from review_items where id = $1`,
    [id]
  );
}

// ---------------------------------------------------------------------------
// Terms
// ---------------------------------------------------------------------------

// The objective's named terms. Titles that list their terms are read
// deterministically and stored (method 'title'); for the rest the stored
// model extraction is returned, or null when there is none yet (the next
// review batch extracts them). A title edit (different hash) re-reads.
export async function termsFor(objectives: { id: string; title: string }[]): Promise<Map<string, string[] | null>> {
  const out = new Map<string, string[] | null>();
  if (!objectives.length) return out;
  const stored = await query<{ objective_id: string; source_hash: string; terms: string[] }>(
    `select objective_id, source_hash, terms from objective_terms where objective_id = any($1::uuid[])`,
    [objectives.map((o) => o.id)]
  );
  const byId = new Map(stored.map((s) => [s.objective_id, s]));
  for (const o of objectives) {
    const hash = md5(o.title);
    const s = byId.get(o.id);
    if (s && s.source_hash === hash) {
      out.set(o.id, s.terms);
      continue;
    }
    const fromTitle = termsFromTitle(o.title);
    if (fromTitle) {
      await saveTerms(o.id, o.title, fromTitle, "title", null);
      out.set(o.id, fromTitle);
    } else {
      out.set(o.id, null);
    }
  }
  return out;
}

export async function saveTerms(
  objectiveId: string,
  title: string,
  terms: string[],
  method: "title" | "model",
  model: string | null
): Promise<void> {
  await query(
    `insert into objective_terms (objective_id, source_hash, terms, method, model) values ($1, $2, $3, $4, $5)
     on conflict (objective_id) do update set source_hash = excluded.source_hash, terms = excluded.terms,
       method = excluded.method, model = excluded.model, extracted_at = now()`,
    [objectiveId, md5(title), JSON.stringify(terms), method, model]
  );
}

// Lower-cased keys of the terms this learner has answered correctly unaided.
export async function coveredTerms(userId: string, objectiveIds: string[]): Promise<Map<string, Set<string>>> {
  const rows = await query<{ objective_id: string; term: string }>(
    `select objective_id, term from learner_term_coverage where user_id = $1 and objective_id = any($2::uuid[])`,
    [userId, objectiveIds]
  );
  const out = new Map<string, Set<string>>();
  for (const r of rows) {
    const set = out.get(r.objective_id) ?? new Set<string>();
    set.add(r.term);
    out.set(r.objective_id, set);
  }
  return out;
}

export interface CoverageRow {
  objectiveId: string;
  title: string;
  unitTitle: string;
  trackTitle: string;
  terms: { term: string; covered: boolean }[];
}

// Per studied objective (one with a mastery row), its named terms and which
// this learner has shown they know. Objectives whose terms have not been
// listed yet (no review question written for them so far) are left out.
export async function coverageFor(userId: string, trackId: string | null): Promise<CoverageRow[]> {
  const rows = await query<{
    objective_id: string;
    title: string;
    unit_title: string;
    track_title: string;
    terms: string[] | null;
    covered: string[] | null;
  }>(
    `select o.id as objective_id, o.title, cu.title as unit_title, st.title as track_title, ot.terms,
            (select array_agg(c.term) from learner_term_coverage c where c.user_id = $1 and c.objective_id = o.id) as covered
       from mastery m
       join objectives o on o.id = m.objective_id
       join course_units cu on cu.id = o.unit_id
       join subject_tracks st on st.id = cu.track_id
       left join objective_terms ot on ot.objective_id = o.id and ot.source_hash = md5(o.title)
      where m.user_id = $1 and ($2::uuid is null or cu.track_id = $2::uuid) and m.status <> 'Not started'
        and (st.user_id is null or st.user_id = $1)
        and ${isActive("o")} and ${isActive("cu")}
      order by st.title, cu.sort_order, o.sort_order`,
    [userId, trackId]
  );
  return rows
    .filter((r) => Array.isArray(r.terms) && r.terms.length)
    .map((r) => {
      const covered = new Set(r.covered ?? []);
      return {
        objectiveId: r.objective_id,
        title: r.title,
        unitTitle: r.unit_title,
        trackTitle: r.track_title,
        terms: r.terms!.map((t) => ({ term: t, covered: covered.has(termKey(t)) })),
      };
    });
}

// ---------------------------------------------------------------------------
// Recording an answer
// ---------------------------------------------------------------------------

export class AlreadyAnsweredError extends Error {
  constructor(readonly attemptId: string | null) {
    super("This review question has already been answered.");
    this.name = "AlreadyAnsweredError";
  }
}

export interface ReviewAnswerInput {
  userId: string;
  sessionId: string;
  position: number;
  objectiveId: string;
  unitId: string;
  reviewItemId: string;
  terms: string[];
  format: "mc" | "open";
  question: string;
  answer: string;
  verdict: "correct" | "partial" | "incorrect";
  feedback: string;
  classification: string;
  missedParts: string[];
  assisted: boolean; // choices shown before the answer (also read from the item itself)
  clientAttemptId: string | null;
  now?: Date;
}

export interface ReviewAnswerOutcome {
  attempt: Record<string, unknown>;
  wasDue: boolean | null;
  advanced: boolean;
  nextDueOn: string | null;
  termsCredited: string[];
}

// One transaction: the attempt and mastery update (recordAttemptTx, the same
// path lesson answers take), the schedule step, the review log, term
// coverage, the older error_log entry and the session item. The session item
// is locked first, so a second submit of the same question (another device)
// finds it answered instead of recording twice.
//
// The attempt is kind 'review', stage 'review', with assessment_type
// free_response or multiple_choice: direct, spaced evidence in the weighted
// model (migration 031), unassisted unless the choices were shown before the
// answer, typed or picked (assist_reason 'hint', REQ-117).
export async function recordReviewAnswer(input: ReviewAnswerInput): Promise<ReviewAnswerOutcome> {
  const now = input.now ?? new Date();
  return withTransaction(async (tx) => {
    const item = await tx.queryOne<{ attempt_id: string | null; answered_at: string | null; choices_shown_at: string | null }>(
      `select si.attempt_id, si.answered_at, si.choices_shown_at from review_session_items si
         join review_sessions s on s.id = si.session_id
        where si.session_id = $1 and si.position = $2 and s.user_id = $3
        for update of si`,
      [input.sessionId, input.position, input.userId]
    );
    if (!item) throw new Error("review session item not found");
    if (item.answered_at) throw new AlreadyAnsweredError(item.attempt_id);

    // REQ-117 (T4, FAIL-343): any answer given after the choices were shown
    // is helped -- a pick from them as much as a typed answer. Read here,
    // under the item's row lock, not taken from the caller: a pick from the
    // choices used to count as unaided recall and climb to the 60-day rung.
    const helped = input.assisted || !!item.choices_shown_at;
    const assistReason: AssistReason | null = helped ? "hint" : null;
    const attempt = await recordAttemptTx(tx, {
      userId: input.userId,
      unitId: input.unitId,
      objectiveId: input.objectiveId,
      kind: "review",
      stage: "review",
      format: input.format,
      question: input.question,
      answer: input.answer,
      verdict: input.verdict,
      feedback: input.feedback,
      classification: input.classification,
      missedParts: input.missedParts,
      clientAttemptId: input.clientAttemptId,
      assessmentType: input.format === "open" ? "free_response" : "multiple_choice",
      assist: assistReason,
    });

    // The grader may also have found it assisted (a repeat of an earlier
    // question); either way it is not an unaided review answer.
    const assisted = helped || attempt.assisted === true;
    const sched = await stepSchedule(tx, input.userId, input.objectiveId, attempt.id as string, input.verdict, assisted, now);

    const unaided = input.verdict === "correct" && !assisted;
    const termsCredited = unaided ? input.terms : [];
    for (const t of termsCredited) {
      await tx.query(
        `insert into learner_term_coverage (user_id, objective_id, term) values ($1, $2, $3)
         on conflict (user_id, objective_id, term) do update set
           correct_count = learner_term_coverage.correct_count + 1, last_correct_at = now()`,
        [input.userId, input.objectiveId, termKey(t)]
      );
    }
    if (unaided) {
      // Same step as recordAttemptTx's for a correct Solo answer: due
      // entries on this objective move on one interval.
      await tx.query(
        `update error_log
            set review_stage = review_stage + 1,
                resolved = (review_stage + 1) >= 3,
                next_review_at = case review_stage + 1
                                   when 1 then current_date + 7
                                   when 2 then current_date + 21
                                   else null
                                 end
          where user_id = $1 and objective_id = $2 and resolved = false and next_review_at <= current_date`,
        [input.userId, input.objectiveId]
      );
    }

    await tx.query(
      `update review_session_items set attempt_id = $3, verdict = $4, answered_at = now()
        where session_id = $1 and position = $2`,
      [input.sessionId, input.position, attempt.id, input.verdict]
    );
    await tx.query(
      `update review_sessions set finished_at = now()
        where id = $1 and finished_at is null
          and not exists (select 1 from review_session_items where session_id = $1 and answered_at is null)`,
      [input.sessionId]
    );
    return { attempt, ...sched, termsCredited };
  });
}


// The stored result of an answered session item, for a replayed submit.
export async function answeredItem(sessionId: string, position: number) {
  return queryOne<Record<string, any>>(
    `select a.*, si.position from review_session_items si join attempts a on a.id = si.attempt_id
      where si.session_id = $1 and si.position = $2`,
    [sessionId, position]
  );
}
