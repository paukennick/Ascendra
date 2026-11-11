import { query } from "@/lib/db";
import { isActive } from "@/lib/progress-sql";
import { addDays, MIN_REVIEW_GAP_HOURS } from "@/lib/review-scheduler";
import { wasRough } from "@/lib/review-plan";
import { lastSessionStats } from "@/lib/review-store";
import { studyNoticeAcceptedSql } from "@/lib/study-notice";
import {
  planReminders,
  secondsPerQuestion,
  shortCourseName,
  type CourseInfo,
  type DueObjective,
  type ReminderPayload,
} from "@/lib/reminder-plan";

// REQ-197: database side of the reminder plan (lib/reminder-plan.ts). The
// same objectives Today's review would serve (lib/review-store.ts
// dueObjectives: visible courses, active units and objectives, the study
// notice for gated courses), but up to the last day of the plan instead of
// today only, so the phone can schedule the next few days in one go.

const TIMING_WINDOW_DAYS = 30;

export async function dueThrough(userId: string, today: string, lastDay: string): Promise<DueObjective[]> {
  const rows = await query<{
    objective_id: string;
    title: string;
    track_id: string;
    due_on: string;
    step: number;
    lapses: number;
    status: string | null;
    unit_weight: string | number | null;
    unit_objectives: string | number;
  }>(
    // REQ-218 (H8): a scheduled objective appears in Today's review only
    // MIN_REVIEW_GAP_HOURS after its last review, so it is planned for the
    // later of its date and the day that gap ends -- the day the review
    // screen will actually serve it, not the (earlier) day the date says.
    `with sched as (
       select objective_id, due_on, step, lapses from (
         select objective_id, step, lapses,
                greatest(due_on, ((coalesce(last_reviewed_at, enrolled_at) + make_interval(hours => $4::int)) at time zone 'UTC')::date) as due_on
           from review_schedule where user_id = $1
       ) rs where rs.due_on <= $3::date
     ), err as (
       select e.objective_id, min(e.next_review_at)::date as due_on from error_log e
        where e.user_id = $1 and not e.resolved and e.objective_id is not null and e.next_review_at <= $3::date
          and not exists (select 1 from review_schedule rs where rs.user_id = $1 and rs.objective_id = e.objective_id)
        group by e.objective_id
     ), due as (
       select coalesce(s.objective_id, e.objective_id) as objective_id,
              least(s.due_on, e.due_on) as due_on,
              coalesce(s.step, -1) as step, coalesce(s.lapses, 0) as lapses
         from sched s full join err e on e.objective_id = s.objective_id
     )
     select d.objective_id, o.title, cu.track_id, to_char(d.due_on, 'YYYY-MM-DD') as due_on, d.step, d.lapses,
            m.status::text as status, cu.weight as unit_weight,
            (select count(*) from objectives o2 where o2.unit_id = cu.id and ${isActive("o2")}) as unit_objectives
       from due d
       join objectives o on o.id = d.objective_id
       join course_units cu on cu.id = o.unit_id
       join subject_tracks st on st.id = cu.track_id
       left join mastery m on m.user_id = $1 and m.objective_id = d.objective_id
      where (st.user_id is null or st.user_id = $1)
        and ${isActive("o")} and ${isActive("cu")}
        and (not coalesce(st.requires_acknowledgement, false) or ${studyNoticeAcceptedSql("$1")})
        and d.objective_id not in (
          select si.objective_id from review_session_items si join review_sessions s on s.id = si.session_id
           where s.user_id = $1 and si.answered_at is not null
             and si.answered_at >= ($2::date)::timestamp at time zone 'UTC'
             and si.answered_at < ($2::date + 1)::timestamp at time zone 'UTC')`,
    [userId, today, lastDay, MIN_REVIEW_GAP_HOURS]
  );
  return rows.map((r) => {
    const n = Math.max(1, Number(r.unit_objectives));
    const w = r.unit_weight == null || Number(r.unit_weight) <= 0 ? 100 : Number(r.unit_weight);
    return {
      objectiveId: r.objective_id,
      title: r.title,
      trackId: r.track_id,
      dueOn: r.due_on,
      step: Number(r.step),
      lapses: Number(r.lapses),
      status: r.status,
      examWeight: w / n,
    };
  });
}

export async function courseInfo(userId: string, trackIds: string[]): Promise<Map<string, CourseInfo>> {
  if (!trackIds.length) return new Map();
  const rows = await query<{
    id: string;
    title: string;
    credential_name: string | null;
    provider_name: string | null;
    exam_code: string | null;
    exam_date: string | null;
  }>(
    `select st.id, st.title, c.name as credential_name, cp.name as provider_name, ce.exam_code,
            to_char(sp.exam_date, 'YYYY-MM-DD') as exam_date
       from subject_tracks st
       left join credential_exams ce on ce.id = st.credential_exam_id
       left join credentials c on c.id = ce.credential_id
       left join credential_providers cp on cp.id = c.provider_id
       left join study_plans sp on sp.user_id = $1 and sp.track_id = st.id
      where st.id = any($2::uuid[])`,
    [userId, trackIds]
  );
  return new Map(
    rows.map((r) => [
      r.id,
      {
        trackId: r.id,
        shortName: shortCourseName({
          credentialName: r.credential_name,
          providerName: r.provider_name,
          examCode: r.exam_code,
          trackTitle: r.title,
        }),
        examDate: r.exam_date,
      },
    ])
  );
}

// Seconds between consecutive answers in the learner's own review sessions
// over the last 30 days. The first answer of a session has no gap and is
// left out (it includes opening the app).
export async function recentAnswerGaps(userId: string): Promise<number[]> {
  const rows = await query<{ gap: string | number }>(
    `select extract(epoch from (si.answered_at - lag(si.answered_at) over (partition by si.session_id order by si.answered_at))) as gap
       from review_session_items si join review_sessions s on s.id = si.session_id
      where s.user_id = $1 and si.answered_at is not null
        and si.answered_at > now() - make_interval(days => $2)`,
    [userId, TIMING_WINDOW_DAYS]
  );
  return rows.filter((r) => r.gap != null).map((r) => Number(r.gap));
}

export async function reminderPlan(userId: string, today: string, days: number): Promise<ReminderPayload[]> {
  const due = await dueThrough(userId, today, addDays(today, days - 1));
  if (!due.length) return [];
  const courses = await courseInfo(userId, [...new Set(due.map((d) => d.trackId))]);
  const [gaps, last] = await Promise.all([recentAnswerGaps(userId), lastSessionStats(userId)]);
  return planReminders({
    today,
    days,
    due,
    courses,
    secondsPerQuestion: secondsPerQuestion(gaps),
    roughLastSession: wasRough(last),
  });
}
