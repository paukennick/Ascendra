// REQ-262: how the Explain first / Example first test is read
// (docs/teach-order-test.md). Read-only SQL over learner_events (the lesson
// events carry detail.order and detail.order_source), attempts, mastery and
// learner_teach_order; no learner text and nothing written. A test keeps the
// copy in the doc identical to this one.
//
// One row per (shown order, source, assigned order):
//   arm              the order the lesson showed ("explain_first" / "example_first")
//   source           "assigned" (the learner never chose: a randomized
//                    comparison), "chosen" (they picked it in Settings: a
//                    self-selected group, do not compare it with the others)
//                    or "unknown" (an event with an order and no source)
//   assigned_order   the arm the learner was randomly given. Summing rows by
//                    assigned_order, whatever they were shown, is the
//                    intent-to-treat comparison (stays fair even if choosers
//                    differ from non-choosers)
//   lessons          (learner, objective) lessons whose first order-carrying
//                    event is in the window
//   guided_*         first lesson answer on the Guided check (attempts stage
//                    'fade'), answered and right the first time
//   solo_*           first lesson answer on the Solo check; `solo_unassisted_correct`
//                    is right the first time with no hint
//   settled_24h      lessons started more than 24 hours ago, and
//   independent_after_24h  those whose mastery status is now Independent or
//                    Transfer-ready (the status today, not at the 24th hour)
//   median_teach_seconds   median time from reaching Teach to reaching the
//                    next step, ignoring gaps over 30 minutes (a tab left open)
export const TEACH_ORDER_RESULTS_SQL = `
with lessons as (
  select distinct on (e.user_id, e.objective_id)
         e.user_id, e.objective_id, e.created_at as started_at,
         e.detail->>'order' as arm,
         coalesce(e.detail->>'order_source', 'unknown') as source
    from learner_events e
   where e.detail->>'order' is not null
     and e.objective_id is not null
     and e.created_at >= now() - make_interval(days => $1)
   order by e.user_id, e.objective_id, e.created_at asc, e.id asc
),
per_lesson as (
  select l.user_id, l.arm, l.source, l.started_at,
         t.assigned_order,
         g.verdict as guided_verdict,
         s.verdict as solo_verdict,
         coalesce(s.assisted, false) as solo_assisted,
         m.status::text as status,
         extract(epoch from (nxt.next_at - te.taught_at)) as teach_seconds
    from lessons l
    left join learner_teach_order t on t.user_id = l.user_id
    left join lateral (
      select a.verdict::text as verdict
        from attempts a
       where a.user_id = l.user_id and a.objective_id = l.objective_id
         and a.kind = 'lesson' and a.stage = 'fade' and a.voided_at is null
       order by a.created_at asc, a.id asc limit 1) g on true
    left join lateral (
      select a.verdict::text as verdict, a.assisted
        from attempts a
       where a.user_id = l.user_id and a.objective_id = l.objective_id
         and a.kind = 'lesson' and a.stage = 'solo' and a.voided_at is null
       order by a.created_at asc, a.id asc limit 1) s on true
    left join mastery m on m.user_id = l.user_id and m.objective_id = l.objective_id
    left join lateral (
      select min(x.created_at) as taught_at
        from learner_events x
       where x.user_id = l.user_id and x.objective_id = l.objective_id
         and x.event = 'lesson_step_reached' and x.detail->>'step' = 'teach') te on true
    left join lateral (
      select min(x.created_at) as next_at
        from learner_events x
       where x.user_id = l.user_id and x.objective_id = l.objective_id
         and x.event = 'lesson_step_reached' and x.detail->>'step' in ('fade', 'solo', 'lab', 'done')
         and x.created_at > te.taught_at) nxt on true
)
select p.arm, p.source, p.assigned_order,
       count(*)::int as lessons,
       count(distinct p.user_id)::int as learners,
       count(*) filter (where p.guided_verdict is not null)::int as guided_answered,
       count(*) filter (where p.guided_verdict = 'correct')::int as guided_first_try_correct,
       count(*) filter (where p.solo_verdict is not null)::int as solo_answered,
       count(*) filter (where p.solo_verdict = 'correct')::int as solo_first_try_correct,
       count(*) filter (where p.solo_verdict = 'correct' and not p.solo_assisted)::int as solo_unassisted_correct,
       count(*) filter (where p.started_at < now() - interval '24 hours')::int as settled_24h,
       count(*) filter (where p.started_at < now() - interval '24 hours'
                          and p.status in ('Independent', 'Transfer-ready'))::int as independent_after_24h,
       round((percentile_cont(0.5) within group (order by p.teach_seconds)
              filter (where p.teach_seconds between 0 and 1800))::numeric)::int as median_teach_seconds
  from per_lesson p
 group by p.arm, p.source, p.assigned_order
 order by p.arm, p.source, p.assigned_order nulls last
`;

export interface TeachOrderRow {
  arm: string;
  source: string;
  assignedOrder: string | null;
  lessons: number;
  learners: number;
  guidedAnswered: number;
  guidedFirstTryCorrect: number;
  soloAnswered: number;
  soloFirstTryCorrect: number;
  soloUnassistedCorrect: number;
  settled24h: number;
  independentAfter24h: number;
  medianTeachSeconds: number | null;
}

type Run = (sql: string, params: unknown[]) => Promise<Array<Record<string, unknown>>>;

export async function teachOrderResults(run: Run, days = 30): Promise<TeachOrderRow[]> {
  const rows = await run(TEACH_ORDER_RESULTS_SQL, [days]);
  return rows.map((r) => ({
    arm: String(r.arm),
    source: String(r.source),
    assignedOrder: r.assigned_order == null ? null : String(r.assigned_order),
    lessons: Number(r.lessons ?? 0),
    learners: Number(r.learners ?? 0),
    guidedAnswered: Number(r.guided_answered ?? 0),
    guidedFirstTryCorrect: Number(r.guided_first_try_correct ?? 0),
    soloAnswered: Number(r.solo_answered ?? 0),
    soloFirstTryCorrect: Number(r.solo_first_try_correct ?? 0),
    soloUnassistedCorrect: Number(r.solo_unassisted_correct ?? 0),
    settled24h: Number(r.settled_24h ?? 0),
    independentAfter24h: Number(r.independent_after_24h ?? 0),
    medianTeachSeconds: r.median_teach_seconds == null ? null : Number(r.median_teach_seconds),
  }));
}

const pct = (n: number, d: number) => (d > 0 ? `${((100 * n) / d).toFixed(0)}% (${n}/${d})` : "n/a (0)");

export function formatTeachOrderResults(rows: TeachOrderRow[], days: number): string {
  const lines = [`Explain first / Example first, lessons started in the last ${days} days (usage may still be test traffic: read every rate with its counts)`];
  if (rows.length === 0) return [...lines, "  No lessons with an order recorded yet."].join("\n");
  for (const r of rows) {
    lines.push(
      `  shown ${r.arm}, ${r.source}, assigned ${r.assignedOrder ?? "none"}: ${r.lessons} lessons, ${r.learners} learners; ` +
        `guided first try ${pct(r.guidedFirstTryCorrect, r.guidedAnswered)}, ` +
        `solo first try ${pct(r.soloFirstTryCorrect, r.soloAnswered)} (no hint ${pct(r.soloUnassistedCorrect, r.soloAnswered)}), ` +
        `Independent after 24h ${pct(r.independentAfter24h, r.settled24h)}, ` +
        `median time in Teach ${r.medianTeachSeconds === null ? "n/a" : `${r.medianTeachSeconds}s`}`
    );
  }
  return lines.join("\n");
}
