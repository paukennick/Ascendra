import { query } from "@/lib/db";
import { AUTHORED_LESSON_MODEL } from "@/lib/authored-lessons";

// REQ-235 ("make holds rare"): how often generated content is held back, per
// course and item kind, for the owner (Settings > Access). Counts only: no
// claims, no content, no learner, no learner's own course.
//
//   stored  generated items saved in the window, from the tables that hold
//           them (lesson_content and a learner's regenerate, review_items,
//           exam_items with source 'generated', coach_quiz_items,
//           concept_sets, pbq_scenarios, unit_check_items). Authored lessons
//           and lesson checks copied into the exam bank are not generation.
//   held    drafts the generation gate held back (item_holdbacks), by the
//           gate's reasons (lib/generation-gate.ts): the writer was unsure,
//           the fact-check picked a different answer, or a content rule was
//           broken. Two kinds of row in that table are NOT holds and are
//           left out: a re-check or sandbox job's staged finding (content
//           has `staged`, lib/staging.ts) and a lesson a person replaced
//           with scripts/lessons:fix (lib/lesson-fixes.ts logs the old
//           database row, whose keys are snake_case: `fade_problem`). A check
//           that could not run (`fact_check_error`) is not a verdict either.
//   rate    held / (stored + held): the share of drafts written that were
//           not used. A lesson retried after a hold counts one held draft and
//           one stored item.
//
// Only catalog courses (subject_tracks.user_id is null) are listed. A lesson
// intro hold counts under "lesson".

export const HOLD_RATE_WINDOWS = [7, 30] as const;
export const HOLD_KINDS = ["lesson", "review", "exam", "quiz", "comparison", "pbq", "unit_check"] as const;
export type HoldKind = (typeof HOLD_KINDS)[number];
export const HOLD_REASONS = ["writer_unsure", "checker_disagreed", "content_rule"] as const;
export type HoldReasonKey = (typeof HOLD_REASONS)[number];

export interface HoldRateRow {
  code: string;
  title: string;
  kind: HoldKind;
  stored7: number;
  held7: number;
  stored30: number;
  held30: number;
}

export interface HoldReasonRow {
  code: string;
  reason: HoldReasonKey;
  n30: number;
}

export interface HoldRateCourse {
  code: string;
  title: string;
  kinds: { kind: HoldKind; stored7: number; held7: number; stored30: number; held30: number }[];
  // the last 30 days, most frequent first
  topReasons: { reason: HoldReasonKey; n: number }[];
}

export interface HoldRateReport {
  asOf: string;
  courses: HoldRateCourse[];
}

// The SQL that resolves a stored item to its catalog course. $1 is the
// 30-day window start, $2 the 7-day one.
const STORED_SQL = `
  with stored(track_id, kind, at) as (
    select cu.track_id, 'lesson', lc.generated_at
      from lesson_content lc join objectives o on o.id = lc.objective_id join course_units cu on cu.id = o.unit_id
     where lc.generated_at >= $1 and coalesce(lc.model, '') <> '${AUTHORED_LESSON_MODEL}'
    union all
    select cu.track_id, 'lesson', lo.generated_at
      from lesson_content_overrides lo join objectives o on o.id = lo.objective_id join course_units cu on cu.id = o.unit_id
     where lo.generated_at >= $1
    union all
    select cu.track_id, 'review', ri.generated_at
      from review_items ri join objectives o on o.id = ri.objective_id join course_units cu on cu.id = o.unit_id
     where ri.generated_at >= $1
    union all
    select cu.track_id, 'exam', ei.created_at
      from exam_items ei join objectives o on o.id = ei.objective_id join course_units cu on cu.id = o.unit_id
     where ei.created_at >= $1 and ei.source = 'generated'
    union all
    select cu.track_id, 'quiz', qi.generated_at
      from coach_quiz_items qi join objectives o on o.id = qi.objective_id join course_units cu on cu.id = o.unit_id
     where qi.generated_at >= $1
    union all
    select cs.track_id, 'comparison', cs.created_at
      from concept_sets cs
     where cs.created_at >= $1 and cs.source in ('generated', 'learned')
    union all
    select cu.track_id, 'pbq', ps.generated_at
      from pbq_scenarios ps join course_units cu on cu.id = ps.unit_id
     where ps.generated_at >= $1
    union all
    select cu.track_id, 'unit_check', uc.generated_at
      from unit_check_items uc join course_units cu on cu.id = uc.unit_id
     where uc.generated_at >= $1
  )
  select st.code, st.title, s.kind,
         count(*) filter (where s.at >= $2)::int as n7,
         count(*)::int as n30
    from stored s join subject_tracks st on st.id = s.track_id
   where st.user_id is null
   group by st.code, st.title, s.kind`;

// A gate hold, as opposed to a staged finding or a replaced lesson (header).
export const GATE_HOLD_SQL = `
  hb.reason in ('uncertain', 'fact_check')
  and not (hb.content ? 'staged')
  and not (hb.item_kind = 'lesson' and hb.content ? 'fade_problem')`;

const HELD_SQL = `
  with held as (
    select coalesce(hb.track_id, cu_u.track_id, cu_o.track_id) as track_id,
           case when hb.item_kind = 'lesson_intro' then 'lesson' else hb.item_kind end as kind,
           case when hb.reason = 'uncertain' then 'writer_unsure'
                when coalesce(hb.claims->>0, '') like 'content check:%' then 'content_rule'
                else 'checker_disagreed' end as reason,
           hb.created_at as at
      from item_holdbacks hb
      left join course_units cu_u on cu_u.id = hb.unit_id
      left join objectives o on o.id = hb.objective_id
      left join course_units cu_o on cu_o.id = o.unit_id
     where hb.created_at >= $1 and ${GATE_HOLD_SQL}
  )
  select st.code, st.title, h.kind, h.reason,
         count(*) filter (where h.at >= $2)::int as n7,
         count(*)::int as n30
    from held h join subject_tracks st on st.id = h.track_id
   where st.user_id is null
   group by st.code, st.title, h.kind, h.reason`;

interface CountRow {
  code: string;
  title: string;
  kind: string;
  n7: number;
  n30: number;
}

// Pure: the report from the two count queries. Courses with nothing in 30
// days are left out, except those named in `always` (the launch courses),
// which are listed with zeros so a quiet course reads as quiet, not missing.
export function shapeHoldRates(
  stored: CountRow[],
  held: (CountRow & { reason: string })[],
  always: { code: string; title: string }[] = [],
  asOf = new Date()
): HoldRateReport {
  const courses = new Map<string, { title: string; kinds: Map<HoldKind, HoldRateCourse["kinds"][number]>; reasons: Map<HoldReasonKey, number> }>();
  const course = (code: string, title: string) => {
    let c = courses.get(code);
    if (!c) courses.set(code, (c = { title, kinds: new Map(), reasons: new Map() }));
    return c;
  };
  const kindOf = (c: ReturnType<typeof course>, k: string) => {
    const kind = (HOLD_KINDS as readonly string[]).includes(k) ? (k as HoldKind) : null;
    if (!kind) return null;
    let row = c.kinds.get(kind);
    if (!row) c.kinds.set(kind, (row = { kind, stored7: 0, held7: 0, stored30: 0, held30: 0 }));
    return row;
  };
  for (const r of stored) {
    const row = kindOf(course(r.code, r.title), r.kind);
    if (!row) continue;
    row.stored7 += r.n7;
    row.stored30 += r.n30;
  }
  for (const r of held) {
    const c = course(r.code, r.title);
    const row = kindOf(c, r.kind);
    if (!row) continue;
    row.held7 += r.n7;
    row.held30 += r.n30;
    const reason = (HOLD_REASONS as readonly string[]).includes(r.reason) ? (r.reason as HoldReasonKey) : "checker_disagreed";
    if (r.n30) c.reasons.set(reason, (c.reasons.get(reason) ?? 0) + r.n30);
  }
  for (const a of always) course(a.code, a.title);
  const order = new Map(always.map((a, i) => [a.code, i]));
  const out: HoldRateCourse[] = [...courses.entries()].map(([code, c]) => ({
    code,
    title: c.title,
    kinds: HOLD_KINDS.map((k) => c.kinds.get(k)).filter((k): k is NonNullable<typeof k> => !!k),
    topReasons: [...c.reasons.entries()].map(([reason, n]) => ({ reason, n })).sort((a, b) => b.n - a.n || a.reason.localeCompare(b.reason)),
  }));
  out.sort((a, b) => (order.get(a.code) ?? 1e9) - (order.get(b.code) ?? 1e9) || a.code.localeCompare(b.code));
  return { asOf: asOf.toISOString(), courses: out };
}

// The launch courses Nick named for batch H (2026-11-11), always listed.
export const LAUNCH_COURSES = ["DPT", "PTPREREQ", "CCRNADULT", "AWSSAA", "AWSMLA", "SECPLUS", "CNA"] as const;

export async function holdRateReport(now = new Date()): Promise<HoldRateReport> {
  const d30 = new Date(now.getTime() - 30 * 86_400_000);
  const d7 = new Date(now.getTime() - 7 * 86_400_000);
  const [stored, held, launch] = await Promise.all([
    query<CountRow>(STORED_SQL, [d30, d7]),
    query<CountRow & { reason: string }>(HELD_SQL, [d30, d7]),
    query<{ code: string; title: string }>(
      `select code, title from subject_tracks where user_id is null and code = any($1::text[])`,
      [[...LAUNCH_COURSES]]
    ),
  ]);
  const byCode = new Map(launch.map((l) => [l.code, l]));
  const always = LAUNCH_COURSES.map((c) => byCode.get(c)).filter((l): l is { code: string; title: string } => !!l);
  return shapeHoldRates(stored, held, always, now);
}
