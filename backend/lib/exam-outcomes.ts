import { query, queryOne, withTransaction } from "@/lib/db";
import { recordEvent } from "@/lib/events";
import { isDateOnly } from "@/lib/study-plan";

// REQ-119 (Audit 3 product, "I took the exam"): the only way Ascendra can
// learn real pass rates, and so the only honest check of its readiness
// figure. The learner reports the date, passed / failed / would rather not
// say, and optionally a score; they can change or delete it any time. Each
// report records an exam_outcome event (deleted again with the report).
// Table: exam_outcomes (migration 048).

export const OUTCOME_RESULTS = ["passed", "failed", "not_said"] as const;
export type OutcomeResult = (typeof OUTCOME_RESULTS)[number];

// A person sits a handful of exams; this only stops a runaway client.
export const MAX_OUTCOMES_PER_USER = 50;
export const MAX_SCORE = 100_000;
const EARLIEST_DATE = "2000-01-01";

export interface OutcomeInput {
  examDate: string;
  result: OutcomeResult;
  score: number | null;
}

export type OutcomeCheck = { ok: true; value: OutcomeInput } | { ok: false; error: string };

// `today` is the learner's local date (resolveToday). An exam can't be
// reported before it happened; one day of slack covers time zones.
export function validateOutcome(body: unknown, today: string, partial = false): OutcomeCheck | { ok: true; value: Partial<OutcomeInput> } {
  const b = (body ?? {}) as Record<string, unknown>;
  const out: Partial<OutcomeInput> = {};
  if (!partial || b.examDate !== undefined) {
    if (!isDateOnly(b.examDate)) return { ok: false, error: "examDate must be a date (YYYY-MM-DD)" };
    if (b.examDate < EARLIEST_DATE) return { ok: false, error: "examDate is too far in the past" };
    const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    if (b.examDate > tomorrow) return { ok: false, error: "examDate can't be in the future" };
    out.examDate = b.examDate;
  }
  if (!partial || b.result !== undefined) {
    if (!OUTCOME_RESULTS.includes(b.result as OutcomeResult)) {
      return { ok: false, error: `result must be one of: ${OUTCOME_RESULTS.join(", ")}` };
    }
    out.result = b.result as OutcomeResult;
  }
  if (!partial || b.score !== undefined) {
    if (b.score === null || b.score === undefined || b.score === "") out.score = null;
    else if (typeof b.score !== "number" || !Number.isFinite(b.score) || b.score < 0 || b.score > MAX_SCORE) {
      return { ok: false, error: `score must be a number from 0 to ${MAX_SCORE}, or left out` };
    } else out.score = Math.round(b.score * 100) / 100;
  }
  return { ok: true, value: out };
}

export interface OutcomeRow {
  id: string;
  track_id: string | null;
  track_title: string | null;
  exam_date: string;
  result: OutcomeResult;
  score: number | null;
  created_at: string;
  updated_at: string;
}

const SELECT = `select eo.id, eo.track_id, st.title as track_title, to_char(eo.exam_date, 'YYYY-MM-DD') as exam_date,
                       eo.result, eo.score::float8 as score, eo.created_at, eo.updated_at
                  from exam_outcomes eo left join subject_tracks st on st.id = eo.track_id`;

export async function listOutcomes(userId: string, trackId: string | null): Promise<OutcomeRow[]> {
  return query<OutcomeRow & Record<string, unknown>>(
    `${SELECT} where eo.user_id = $1 and ($2::uuid is null or eo.track_id = $2) order by eo.exam_date desc, eo.created_at desc`,
    [userId, trackId]
  );
}

export async function getOutcome(userId: string, id: string): Promise<OutcomeRow | null> {
  return queryOne<OutcomeRow & Record<string, unknown>>(`${SELECT} where eo.user_id = $1 and eo.id = $2`, [userId, id]);
}

export class OutcomeLimitError extends Error {}

export async function createOutcome(userId: string, trackId: string | null, v: OutcomeInput): Promise<OutcomeRow> {
  const id = await withTransaction(async (tx) => {
    // Serialise one learner's creates so the cap can't be raced past.
    await tx.query(`select pg_advisory_xact_lock(hashtext($1))`, [`exam_outcomes:${userId}`]);
    const n = await tx.queryOne<{ n: number }>(`select count(*)::int as n from exam_outcomes where user_id = $1`, [userId]);
    if ((n?.n ?? 0) >= MAX_OUTCOMES_PER_USER) throw new OutcomeLimitError("You've recorded the most exam results we keep. Delete an old one to add another.");
    const row = await tx.queryOne<{ id: string }>(
      `insert into exam_outcomes (user_id, track_id, exam_date, result, score) values ($1, $2, $3, $4, $5) returning id`,
      [userId, trackId, v.examDate, v.result, v.score]
    );
    await recordEvent(userId, "exam_outcome", { trackId, refId: row!.id }, (sql, p) => tx.query(sql, p));
    return row!.id;
  });
  return (await getOutcome(userId, id))!;
}

export async function updateOutcome(userId: string, id: string, v: Partial<OutcomeInput>): Promise<OutcomeRow | null> {
  const row = await queryOne<{ id: string }>(
    `update exam_outcomes
        set exam_date = coalesce($3, exam_date),
            result = coalesce($4, result),
            score = case when $5::boolean then $6::numeric else score end,
            updated_at = now()
      where user_id = $1 and id = $2
      returning id`,
    [userId, id, v.examDate ?? null, v.result ?? null, v.score !== undefined, v.score ?? null]
  );
  return row ? getOutcome(userId, id) : null;
}

export async function deleteOutcome(userId: string, id: string): Promise<boolean> {
  return withTransaction(async (tx) => {
    const gone = await tx.queryOne<{ id: string }>(`delete from exam_outcomes where user_id = $1 and id = $2 returning id`, [userId, id]);
    if (!gone) return false;
    await tx.query(`delete from learner_events where user_id = $1 and event = 'exam_outcome' and ref_id = $2`, [userId, id]);
    return true;
  });
}

// For the course page: the study plan's exam date and whether to ask "How
// did it go?" -- the date has passed (on the learner's calendar) and nothing
// is recorded for this course on or after it.
export async function outcomePrompt(userId: string, trackId: string, today: string): Promise<{ examDate: string | null; ask: boolean }> {
  const plan = await queryOne<{ exam_date: string | null }>(
    `select to_char(exam_date, 'YYYY-MM-DD') as exam_date from study_plans where user_id = $1 and track_id = $2`,
    [userId, trackId]
  );
  const examDate = plan?.exam_date ?? null;
  if (!examDate || examDate > today) return { examDate, ask: false };
  const reported = await queryOne<{ ok: boolean }>(
    `select true as ok from exam_outcomes where user_id = $1 and track_id = $2 and exam_date >= $3 limit 1`,
    [userId, trackId, examDate]
  );
  return { examDate, ask: !reported };
}
