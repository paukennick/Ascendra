// REQ-119 (Audit 3 product M8): `npm run metrics` -- a plain summary of
// whether new learners get going and come back, from learner_events
// (migration 048) and app_users only. No third-party analytics.
//
// Definitions (all times UTC, cohort = accounts created in the last `days`):
//   activation   share of the cohort that finished a first lesson (reached
//                its Solo step) within 7 days of signing up
//   first run    share of the cohort that completed or skipped first run
//   D1 / D7      of cohort accounts old enough to have had that day, the
//                share with any learning event between N and N+1 days after
//                sign-up ("came back and studied on day N")
//   reviews per active learner
//                review sessions finished in the last 7 days divided by
//                accounts with any learning event in the last 7 days
//   exam results reported outcomes in the window: passed / failed / not said
// Events only exist from the day 048 is applied, so accounts created before
// it are left out of every cohort figure.

export interface MetricsSummary {
  days: number;
  cohort: number;
  firstRunCompleted: number;
  activated: number;
  d1: { eligible: number; returned: number };
  d7: { eligible: number; returned: number };
  activeLast7: number;
  reviewsLast7: number;
  outcomes: { passed: number; failed: number; notSaid: number };
}

export const METRICS_SQL = `
with cohort as (
  select u.id, u.created_at from app_users u
   where u.created_at >= now() - make_interval(days => $1)
     and u.created_at >= coalesce($2::timestamptz, '-infinity'::timestamptz)
)
select
  (select count(*) from cohort)::int as cohort,
  (select count(*) from cohort c where exists (
     select 1 from learner_events e where e.user_id = c.id and e.event = 'first_run_completed'))::int as first_run,
  (select count(*) from cohort c where exists (
     select 1 from learner_events e where e.user_id = c.id and e.event = 'lesson_finished'
        and e.created_at < c.created_at + interval '7 days'))::int as activated,
  (select count(*) from cohort c where c.created_at <= now() - interval '2 days')::int as d1_eligible,
  (select count(*) from cohort c where c.created_at <= now() - interval '2 days' and exists (
     select 1 from learner_events e where e.user_id = c.id
        and e.created_at >= c.created_at + interval '1 day' and e.created_at < c.created_at + interval '2 days'))::int as d1_returned,
  (select count(*) from cohort c where c.created_at <= now() - interval '8 days')::int as d7_eligible,
  (select count(*) from cohort c where c.created_at <= now() - interval '8 days' and exists (
     select 1 from learner_events e where e.user_id = c.id
        and e.created_at >= c.created_at + interval '7 days' and e.created_at < c.created_at + interval '8 days'))::int as d7_returned,
  (select count(distinct user_id) from learner_events where created_at >= now() - interval '7 days')::int as active7,
  (select count(*) from learner_events where event = 'review_done' and created_at >= now() - interval '7 days')::int as reviews7,
  (select count(*) from exam_outcomes where result = 'passed' and created_at >= now() - make_interval(days => $1))::int as passed,
  (select count(*) from exam_outcomes where result = 'failed' and created_at >= now() - make_interval(days => $1))::int as failed,
  (select count(*) from exam_outcomes where result = 'not_said' and created_at >= now() - make_interval(days => $1))::int as not_said
`;

type Run = (sql: string, params: unknown[]) => Promise<Array<Record<string, unknown>>>;

// `since`: when 048 was applied (scripts/metrics.ts reads it from the
// schema_migrations ledger); accounts older than that have no events.
export async function metricsSummary(run: Run, days = 30, since: Date | null = null): Promise<MetricsSummary> {
  const r = (await run(METRICS_SQL, [days, since]))[0] ?? {};
  const n = (k: string) => Number(r[k] ?? 0);
  return {
    days,
    cohort: n("cohort"),
    firstRunCompleted: n("first_run"),
    activated: n("activated"),
    d1: { eligible: n("d1_eligible"), returned: n("d1_returned") },
    d7: { eligible: n("d7_eligible"), returned: n("d7_returned") },
    activeLast7: n("active7"),
    reviewsLast7: n("reviews7"),
    outcomes: { passed: n("passed"), failed: n("failed"), notSaid: n("not_said") },
  };
}

function pct(part: number, whole: number): string {
  if (whole === 0) return "n/a (no one yet)";
  return `${Math.round((part / whole) * 1000) / 10}% (${part} of ${whole})`;
}

export function formatMetrics(m: MetricsSummary): string {
  const told = m.outcomes.passed + m.outcomes.failed;
  const perActive = m.activeLast7 === 0 ? "n/a (no active learners)" : (m.reviewsLast7 / m.activeLast7).toFixed(2);
  return [
    `Ascendra learning metrics -- accounts created in the last ${m.days} days (UTC)`,
    `  New accounts:                  ${m.cohort}`,
    `  First run done or skipped:     ${pct(m.firstRunCompleted, m.cohort)}`,
    `  Activation (lesson in 7 days): ${pct(m.activated, m.cohort)}`,
    `  D1 retention:                  ${pct(m.d1.returned, m.d1.eligible)}`,
    `  D7 retention:                  ${pct(m.d7.returned, m.d7.eligible)}`,
    `Last 7 days`,
    `  Active learners:               ${m.activeLast7}`,
    `  Reviews per active learner:    ${perActive} (${m.reviewsLast7} review sessions)`,
    `Exam results reported in the last ${m.days} days`,
    `  Passed ${m.outcomes.passed}, failed ${m.outcomes.failed}, didn't say ${m.outcomes.notSaid}; ` +
      `pass rate among those who said: ${pct(m.outcomes.passed, told)}`,
    `Small numbers swing a lot; read percentages with their counts.`,
  ].join("\n");
}
