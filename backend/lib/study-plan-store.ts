import { query, queryOne } from "@/lib/db";
import { isDateOnly, type KeptState, type PlanInput, type PlanObjective, type PlanUnit } from "@/lib/study-plan";

// REQ-110: reads everything lib/study-plan.ts needs for one learner and
// course. Stored mastery rows (not mastery_detail) are enough for the plan, so
// opening it costs a handful of indexed reads and no AI call.

export interface PlanSettings {
  examDate: string | null;
  weeklyHours: number;
  saved: boolean;
}

export const DEFAULT_WEEKLY_HOURS = 5;
export const MIN_WEEKLY_HOURS = 0.5;
export const MAX_WEEKLY_HOURS = 60;
// An exam more than this far out is almost certainly a typo.
export const MAX_DAYS_AHEAD = 3 * 365;

export async function planSettings(userId: string, trackId: string): Promise<PlanSettings> {
  const row = await queryOne<{ exam_date: string | null; weekly_hours: string }>(
    `select to_char(exam_date, 'YYYY-MM-DD') as exam_date, weekly_hours from study_plans where user_id = $1 and track_id = $2`,
    [userId, trackId]
  );
  if (!row) return { examDate: null, weeklyHours: DEFAULT_WEEKLY_HOURS, saved: false };
  return { examDate: row.exam_date, weeklyHours: Number(row.weekly_hours), saved: true };
}

export async function savePlanSettings(userId: string, trackId: string, s: { examDate: string | null; weeklyHours: number }) {
  await query(
    `insert into study_plans (user_id, track_id, exam_date, weekly_hours) values ($1, $2, $3::date, $4)
     on conflict (user_id, track_id) do update set exam_date = excluded.exam_date, weekly_hours = excluded.weekly_hours,
       updated_at = now()`,
    [userId, trackId, s.examDate, s.weeklyHours]
  );
}

// The learner's own date, sent by the app (their time zone decides when a day
// starts). Accepted only within a day of the server's UTC date, so a wrong
// clock cannot move the plan around; otherwise the server's date is used.
export function resolveToday(requested: unknown, now: Date = new Date()): string {
  const utc = now.toISOString().slice(0, 10);
  if (!isDateOnly(requested)) return utc;
  const diff = Math.abs(Date.parse(`${requested}T00:00:00Z`) - Date.parse(`${utc}T00:00:00Z`)) / 86_400_000;
  return diff <= 1 ? requested : utc;
}

// Validates a settings update. Returns an error message for the learner, or
// the clean values.
export function validateSettings(
  body: unknown,
  today: string
): { ok: true; value: { examDate: string | null; weeklyHours: number } } | { ok: false; error: string } {
  const b = (body ?? {}) as { examDate?: unknown; weeklyHours?: unknown };
  const examDate = b.examDate === null || b.examDate === undefined || b.examDate === "" ? null : b.examDate;
  if (examDate !== null) {
    if (!isDateOnly(examDate)) return { ok: false, error: "examDate must be a date like 2027-03-15" };
    const days = (Date.parse(`${examDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000;
    if (days < 0) return { ok: false, error: "That exam date has already passed. Pick a date from today on." };
    if (days > MAX_DAYS_AHEAD) return { ok: false, error: "That exam date is more than three years away." };
  }
  const hours = typeof b.weeklyHours === "string" ? Number(b.weeklyHours) : b.weeklyHours;
  if (typeof hours !== "number" || !Number.isFinite(hours) || hours < MIN_WEEKLY_HOURS || hours > MAX_WEEKLY_HOURS) {
    return { ok: false, error: `weeklyHours must be between ${MIN_WEEKLY_HOURS} and ${MAX_WEEKLY_HOURS}` };
  }
  return { ok: true, value: { examDate: examDate as string | null, weeklyHours: Math.round(hours * 2) / 2 } };
}

// Per objective: stored status, whether placement tested it out, and its
// "kept" state. Kept is worked out from graded direct answers the weighted
// model counts (an assessment type with weight above 0, never a retry):
// an objective is completed once any such answer is correct; it is kept if
// its latest SPACED answer -- one at least spacing_gap_hours after the answer
// before it -- was correct, slipped if that answer was not, and unchecked if
// it has no spaced answer yet.
export async function planObjectives(userId: string, trackId: string): Promise<PlanObjective[]> {
  const rows = await query<{
    id: string;
    unit_id: string;
    title: string;
    sort_order: number;
    status: string | null;
    tested_out: boolean;
    completed: boolean | null;
    last_spaced: string | null;
    last_at: Date | null;
  }>(
    `with p as (
       select coalesce(max(value) filter (where name = 'spacing_gap_hours'), 24) * 3600 as gap from mastery_model_params
     ), a as (
       select a.objective_id, a.id, a.created_at, a.verdict,
              lag(a.created_at) over (partition by a.objective_id order by a.created_at, a.id) as prev_at
         from attempts a
         join objectives o on o.id = a.objective_id
         join course_units cu on cu.id = o.unit_id
         join assessment_types ty on ty.type_name = attempt_type_of(a.kind, a.stage, a.format, a.assessment_type)
        where a.user_id = $1 and cu.track_id = $2 and a.verdict is not null and a.format <> 'pbq'
          and (a.kind = 'lesson' or a.assessment_type is not null)
          and ty.cognitive_weight > 0 and a.assist_reason is distinct from 'retry'
     ), k as (
       select a.objective_id,
              bool_or(a.verdict = 'correct') as completed,
              (array_agg(a.verdict::text order by a.created_at desc, a.id desc)
                 filter (where a.prev_at is not null and extract(epoch from a.created_at - a.prev_at) >= p.gap))[1] as last_spaced,
              max(a.created_at) as last_at
         from a cross join p
        group by a.objective_id
     )
     select o.id, o.unit_id, o.title, o.sort_order, m.status::text as status,
            exists (select 1 from placement_items pi join placement_checks pc on pc.id = pi.placement_id
                     where pc.user_id = $1 and pi.objective_id = o.id and pi.correct) as tested_out,
            k.completed, k.last_spaced, k.last_at
       from objectives o
       join course_units cu on cu.id = o.unit_id
       left join mastery m on m.objective_id = o.id and m.user_id = $1
       left join k on k.objective_id = o.id
      where cu.track_id = $2
      order by cu.sort_order, o.sort_order`,
    [userId, trackId]
  );
  return rows.map((r) => {
    let kept: KeptState = null;
    if (r.completed) kept = r.last_spaced == null ? "unchecked" : r.last_spaced === "correct" ? "kept" : "slipped";
    return {
      id: r.id,
      unitId: r.unit_id,
      title: r.title,
      sortOrder: r.sort_order,
      status: r.status ?? "Not started",
      testedOut: r.tested_out,
      kept,
      lastAnsweredAt: r.last_at ? new Date(r.last_at).toISOString() : null,
    };
  });
}

export async function loadPlanInput(userId: string, trackId: string, today: string, settings: PlanSettings): Promise<PlanInput> {
  const units = await query<{ id: string; title: string; weight: string | null; sort_order: number }>(
    `select id, title, weight, sort_order from course_units where track_id = $1 order by sort_order`,
    [trackId]
  );
  const objectives = await planObjectives(userId, trackId);
  const due = await queryOne<{ n: number }>(
    `select count(*)::int as n from error_log e join course_units cu on cu.id = e.unit_id
      where e.user_id = $1 and cu.track_id = $2 and not e.resolved and e.next_review_at <= $3::date`,
    [userId, trackId, today]
  );
  // The latest study day in this course: lesson and PBQ answers only (a
  // placement check or a coached quiz is not "a session that went badly").
  const last = await queryOne<{ day: string; answers: number; correct: number }>(
    `with d as (
       select a.created_at, a.verdict
         from attempts a
         left join objectives o on o.id = a.objective_id
         left join course_units cu on cu.id = coalesce(o.unit_id, a.unit_id)
        where a.user_id = $1 and cu.track_id = $2 and a.kind in ('lesson', 'pbq') and a.verdict is not null
          and a.assist_reason is distinct from 'retry'
     ), lastday as (select max((created_at at time zone 'UTC')::date) as day from d)
     select to_char(l.day, 'YYYY-MM-DD') as day, count(*)::int as answers,
            count(*) filter (where d.verdict = 'correct')::int as correct
       from d join lastday l on (d.created_at at time zone 'UTC')::date = l.day
      group by l.day`,
    [userId, trackId]
  );
  const exam = await queryOne<{ duration_minutes: number | null }>(
    `select ce.duration_minutes from subject_tracks st join credential_exams ce on ce.id = st.credential_exam_id where st.id = $1`,
    [trackId]
  );
  return {
    today,
    examDate: settings.examDate,
    weeklyHours: settings.weeklyHours,
    units: units.map((u): PlanUnit => ({ id: u.id, title: u.title, weight: u.weight == null ? null : Number(u.weight), sortOrder: u.sort_order })),
    objectives,
    dueReviews: due?.n ?? 0,
    lastSession: last ?? null,
    examMinutes: exam?.duration_minutes ?? null,
  };
}
