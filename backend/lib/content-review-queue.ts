import { query, queryOne, withTransaction, type TxClient } from "@/lib/db";
import { evaluateDrop, evaluateReports, signalParams, type SignalParams } from "@/lib/content-signals";

// REQ-143 (migration 055): the daily job that puts content in front of a
// person when learners' behaviour says something may be wrong with it, and
// the queue a person works through. Detection math: lib/content-signals.ts.
//
// The job only RECORDS. It never pulls, hides or changes content; 042's
// quarantine (3 independent flags) and voiding (a person confirms a wrong
// key) are unchanged. Runs from GET /api/cron/content-signals (vercel.json)
// and `npm run review-queue -- run`.
//
// IDEMPOTENT. One open row per (item, signal) (unique partial index); a
// repeat detection refreshes that row's evidence and last_detected_at. A
// resolved row stays as history, and the signal can open a new row only from
// evidence AFTER the resolution: reports filed after it, answers given after
// it. Two runs at once: the second finds the advisory lock taken and skips.

export const SIGNALS = ["learner_reports", "correct_rate_drop"] as const;
export type Signal = (typeof SIGNALS)[number];
export const RESOLUTIONS = ["fixed", "dismissed", "cleared", "confirmed_wrong"] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

const LABEL_MAX = 500;

// Every answer the correct-rate check and the report rate can count, one
// SELECT per content kind with the same seven columns. $1/$2 bound the
// window. Each learner's answer counts once per window (the caller keeps the
// first); voided answers (042) and answers given after help was shown
// (assisted, 029) are left out. A new kind plugs in with one entry here: a
// sim (REQ-141) would be `attempts a ... where a.sim_id is not null`, and its
// "Report a problem" flags (item_flags kind 'sim') are already counted.
const COMMON = `a.user_id is not null and a.verdict is not null and a.voided_at is null and not a.assisted
                and a.created_at >= $1 and a.created_at < $2`;

export const ATTEMPT_SOURCES: Record<string, string> = {
  // A lesson check is identified as lib/item-quality.ts lessonItemId does.
  lesson: `select 'lesson'::text as item_kind, a.objective_id::text || ':' || a.stage || ':' || md5(a.question) as item_id,
                  a.objective_id, a.question as label, a.user_id, a.verdict = 'correct' as correct, a.created_at
             from attempts a
            where a.kind = 'lesson' and a.stage in ('fade', 'solo') and a.objective_id is not null and ${COMMON}`,
  review: `select 'review'::text, si.review_item_id::text, si.objective_id, a.question, a.user_id, a.verdict = 'correct', a.created_at
             from review_session_items si join attempts a on a.id = si.attempt_id
            where si.review_item_id is not null and ${COMMON}`,
  exam: `select 'exam'::text, si.item_id::text, si.objective_id, a.question, a.user_id, a.verdict = 'correct', a.created_at
           from exam_session_items si join attempts a on a.id = si.attempt_id
          where ${COMMON}`,
  quiz: `select 'quiz'::text, q.id::text, a.objective_id, a.question, a.user_id, a.verdict = 'correct', a.created_at
           from attempts a
           join (select distinct on (objective_id, question) id, objective_id, question
                   from coach_quiz_items order by objective_id, question, generated_at) q
             on q.objective_id = a.objective_id and q.question = a.question
          where a.assessment_type = 'coach_quiz' and ${COMMON}`,
  comparison: `select 'comparison'::text, d.id::text, a.objective_id, a.question, a.user_id, a.verdict = 'correct', a.created_at
                 from attempts a
                 join (select distinct on (scenario) id, scenario from discrimination_items order by scenario, created_at) d
                   on d.scenario = a.question
                where a.assessment_type = 'discrimination' and ${COMMON}`,
  lab: `select 'lab'::text, a.lab_id::text, a.objective_id, l.title, a.user_id, a.verdict = 'correct', a.created_at
          from attempts a join labs l on l.id = a.lab_id
         where a.lab_id is not null and ${COMMON}`,
};

const answersSql = () =>
  Object.values(ATTEMPT_SOURCES)
    .map((s) => `(${s})`)
    .join("\nunion all\n");

export interface RunSummary {
  skipped: boolean;
  checked: { reportItems: number; dropItems: number };
  opened: number;
  refreshed: number;
  params?: SignalParams;
}

async function loadParams(tx: TxClient): Promise<SignalParams> {
  const rows = await tx.query<{ name: string; value: string }>(
    `select name, value::text as value from item_quality_params where name like 'signal\\_%'`
  );
  return signalParams(rows);
}

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString();

interface Detection {
  kind: string;
  itemId: string;
  objectiveId: string | null;
  label: string;
  signal: Signal;
  evidence: Record<string, unknown>;
}

async function detectReports(tx: TxClient, p: SignalParams, now: Date): Promise<{ checked: number; found: Detection[] }> {
  const from = new Date(now.getTime() - p.reportWindowDays * DAY);
  // Reports after the later of the window start, the last resolution of this
  // signal, and a person clearing the item through `npm run items` -- what a
  // reviewer already looked at does not count again.
  const rows = await tx.query<{
    item_kind: string;
    item_id: string;
    objective_id: string | null;
    label: string;
    reporters: number;
    since: Date;
    first_at: Date;
    last_at: Date;
    reasons: Record<string, number>;
    notes: string[] | null;
  }>(
    `with res as (
       select item_kind, item_id, max(resolved_at) as at from content_review_queue
        where signal = 'learner_reports' and status = 'resolved' group by 1, 2),
     reports as (
       select f.item_kind::text as item_kind, f.item_id, f.objective_id, f.question as label, f.user_id,
              coalesce(f.reason, 'other')::text as reason, f.note, f.created_at
         from item_flags f
        where f.user_id is not null and f.source in ('learner', 'key_suspect') and f.created_at >= $1 and f.created_at < $2
       union all
       -- "Report a problem with this lesson" (support_requests, migration 027):
       -- a lesson step has no item row, so it is its own kind here.
       select 'lesson_step', s.objective_id::text || ':' || coalesce(s.lesson_stage, 'lesson'), s.objective_id, s.subject,
              s.user_id, 'other', left(s.body, 200), s.created_at
         from support_requests s
        where s.kind = 'content_report' and s.objective_id is not null and s.created_at >= $1 and s.created_at < $2),
     live as (
       select r.*, greatest($1::timestamptz, res.at, case when st.status = 'cleared' then st.resolved_at end) as since
         from reports r
         left join res on res.item_kind = r.item_kind and res.item_id = r.item_id
         left join item_status st on st.item_kind = r.item_kind and st.item_id = r.item_id
        where coalesce(st.status, '') <> 'confirmed_wrong'),
     counted as (select * from live where since = $1::timestamptz or created_at > since)
     select item_kind, item_id,
            (array_agg(objective_id order by created_at desc))[1] as objective_id,
            (array_agg(label order by created_at desc))[1] as label,
            count(distinct user_id)::int as reporters,
            max(since) as since, min(created_at) as first_at, max(created_at) as last_at,
            (select jsonb_object_agg(reason, n) from (select c2.reason, count(*)::int as n from counted c2
               where c2.item_kind = c.item_kind and c2.item_id = c.item_id group by c2.reason) x) as reasons,
            (array_agg(left(note, 200) order by created_at desc) filter (where note is not null and note <> ''))[1:3] as notes
       from counted c
      group by item_kind, item_id
     having count(distinct user_id) >= $3`,
    [iso(from), iso(now), Math.min(p.reportMinLearners, p.reportRateMinReports)]
  );
  if (!rows.length) return { checked: 0, found: [] };

  // Learners who answered each candidate since its cutoff (the rate rule).
  const learners = await tx.query<{ item_kind: string; item_id: string; n: number }>(
    `with c as (select * from unnest($3::text[], $4::text[], $5::timestamptz[]) as c(item_kind, item_id, since)),
          answers as (${answersSql()})
     select c.item_kind, c.item_id, count(distinct a.user_id)::int as n
       from c join answers a on a.item_kind = c.item_kind and a.item_id = c.item_id and a.created_at >= c.since
      group by 1, 2`,
    [iso(from), iso(now), rows.map((r) => r.item_kind), rows.map((r) => r.item_id), rows.map((r) => iso(new Date(r.since)))]
  );
  const answered = new Map(learners.map((l) => [`${l.item_kind}|${l.item_id}`, l.n]));
  const found: Detection[] = [];
  for (const r of rows) {
    // A lesson step has no answers of its own: only the count rule applies.
    const n = r.item_kind === "lesson_step" ? null : answered.get(`${r.item_kind}|${r.item_id}`) ?? 0;
    const v = evaluateReports({ reporters: r.reporters, learners: n }, p);
    if (!v.flagged) continue;
    found.push({
      kind: r.item_kind,
      itemId: r.item_id,
      objectiveId: r.objective_id,
      label: r.label,
      signal: "learner_reports",
      evidence: {
        rules: v.rules,
        reporters: r.reporters,
        learnersAnswered: n,
        reportRate: v.rate === null ? null : Math.round(v.rate * 1000) / 1000,
        reasons: r.reasons ?? {},
        recentNotes: r.notes ?? [],
        window: { from: iso(new Date(r.since)), to: iso(now), days: p.reportWindowDays },
        firstReportAt: iso(new Date(r.first_at)),
        lastReportAt: iso(new Date(r.last_at)),
        thresholds: {
          minLearners: p.reportMinLearners,
          rate: p.reportRate,
          rateMinReports: p.reportRateMinReports,
          rateMinLearners: p.reportRateMinLearners,
        },
      },
    });
  }
  return { checked: rows.length, found };
}

async function detectDrops(tx: TxClient, p: SignalParams, now: Date): Promise<{ checked: number; found: Detection[] }> {
  const recentFrom = new Date(now.getTime() - p.dropRecentDays * DAY);
  const baseFrom = new Date(recentFrom.getTime() - p.dropBaselineDays * DAY);
  const rows = await tx.query<{
    item_kind: string;
    item_id: string;
    objective_id: string | null;
    label: string;
    recent_from: Date;
    base_n: number;
    base_c: number;
    recent_n: number;
    recent_c: number;
  }>(
    `with res as (
       select item_kind, item_id, max(resolved_at) as at from content_review_queue
        where signal = 'correct_rate_drop' and status = 'resolved' group by 1, 2),
     src as (${answersSql()}),
     tagged as (
       select s.*, greatest($3::timestamptz, res.at) as recent_from,
              case when s.created_at >= greatest($3::timestamptz, res.at) then 'recent'
                   when s.created_at < $3::timestamptz then 'base' end as win
         from src s left join res on res.item_kind = s.item_kind and res.item_id = s.item_id),
     firsts as (
       select distinct on (item_kind, item_id, user_id, win) *
         from tagged where win is not null
        order by item_kind, item_id, user_id, win, created_at)
     select f.item_kind, f.item_id,
            (array_agg(f.objective_id))[1] as objective_id,
            (array_agg(f.label order by f.created_at desc))[1] as label,
            max(f.recent_from) as recent_from,
            count(*) filter (where win = 'base')::int as base_n,
            count(*) filter (where win = 'base' and correct)::int as base_c,
            count(*) filter (where win = 'recent')::int as recent_n,
            count(*) filter (where win = 'recent' and correct)::int as recent_c
       from firsts f
      where not exists (select 1 from item_status st where st.item_kind = f.item_kind and st.item_id = f.item_id
                          and st.status = 'confirmed_wrong')
      group by f.item_kind, f.item_id
     having count(*) filter (where win = 'base') >= $4 and count(*) filter (where win = 'recent') >= $5`,
    [iso(baseFrom), iso(now), iso(recentFrom), p.dropMinBaseline, p.dropMinRecent]
  );
  const found: Detection[] = [];
  for (const r of rows) {
    const v = evaluateDrop({ baselineN: r.base_n, baselineCorrect: r.base_c, recentN: r.recent_n, recentCorrect: r.recent_c }, p);
    if (!v.flagged) continue;
    found.push({
      kind: r.item_kind,
      itemId: r.item_id,
      objectiveId: r.objective_id,
      label: r.label,
      signal: "correct_rate_drop",
      evidence: {
        baseline: { learners: r.base_n, correct: r.base_c, rate: v.baselineRate, from: iso(baseFrom), to: iso(recentFrom) },
        recent: { learners: r.recent_n, correct: r.recent_c, rate: v.recentRate, from: iso(new Date(r.recent_from)), to: iso(now) },
        drop: v.drop,
        z: v.z,
        counting: "first answer per learner per window; voided and assisted answers left out",
        thresholds: { minBaseline: p.dropMinBaseline, minRecent: p.dropMinRecent, minDrop: p.dropMinPoints, z: p.dropZ },
      },
    });
  }
  return { checked: rows.length, found };
}

// One daily pass. `now` is for tests.
export async function runContentSignals(opts: { now?: Date } = {}): Promise<RunSummary> {
  const now = opts.now ?? new Date();
  return withTransaction(async (tx) => {
    const lock = await tx.queryOne<{ ok: boolean }>(`select pg_try_advisory_xact_lock(hashtext('content_review_queue:run')) as ok`);
    if (!lock?.ok) return { skipped: true, checked: { reportItems: 0, dropItems: 0 }, opened: 0, refreshed: 0 };
    const p = await loadParams(tx);
    const reports = await detectReports(tx, p, now);
    const drops = await detectDrops(tx, p, now);
    let opened = 0;
    let refreshed = 0;
    for (const d of [...reports.found, ...drops.found]) {
      const r = await tx.queryOne<{ inserted: boolean }>(
        `insert into content_review_queue (item_kind, item_id, objective_id, label, signal, evidence, first_detected_at, last_detected_at)
         values ($1, $2, $3, $4, $5, $6, $7, $7)
         on conflict (item_kind, item_id, signal) where status = 'open'
         do update set evidence = excluded.evidence, label = excluded.label, last_detected_at = excluded.last_detected_at
         returning (xmax = 0) as inserted`,
        [d.kind, d.itemId, d.objectiveId, (d.label ?? "").slice(0, LABEL_MAX), d.signal, JSON.stringify(d.evidence), iso(now)]
      );
      if (r?.inserted) opened++;
      else refreshed++;
    }
    return { skipped: false, checked: { reportItems: reports.checked, dropItems: drops.checked }, opened, refreshed, params: p };
  });
}

export interface QueueRow {
  id: string;
  item_kind: string;
  item_id: string;
  objective_id: string | null;
  label: string;
  signal: Signal;
  status: "open" | "resolved";
  evidence: Record<string, unknown>;
  first_detected_at: Date;
  last_detected_at: Date;
  resolved_at: Date | null;
  resolved_by: string | null;
  resolution: Resolution | null;
  resolution_note: string | null;
  // context for the reviewer
  course: string | null;
  objective: string | null;
  item_status: string | null;
}

export async function listQueue(opts: { status?: "open" | "resolved" | "all"; limit?: number } = {}): Promise<QueueRow[]> {
  const status = opts.status ?? "open";
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  return query<QueueRow>(
    `select q.*, st.code as course, o.title as objective, s.status as item_status
       from content_review_queue q
       left join objectives o on o.id = q.objective_id
       left join course_units cu on cu.id = o.unit_id
       left join subject_tracks st on st.id = cu.track_id
       left join item_status s on s.item_kind = q.item_kind and s.item_id = q.item_id
      where ($1 = 'all' or q.status = $1)
      order by q.status, q.last_detected_at desc
      limit $2`,
    [status, limit]
  );
}

// A person reviewed one entry. Returns false when it is not open (already
// resolved, or no such id).
export async function resolveQueueEntry(id: string, resolution: Resolution, note: string, by: string): Promise<boolean> {
  const r = await queryOne<{ id: string }>(
    `update content_review_queue
        set status = 'resolved', resolved_at = now(), resolution = $2, resolution_note = $3, resolved_by = $4
      where id = $1 and status = 'open' returning id`,
    [id, resolution, note.slice(0, 1000), by.slice(0, 100)]
  );
  return !!r;
}

// Every open entry for an item (both signals), when a person decided the item
// through `npm run items` (clearItem / confirmItemWrong). Never throws: the
// item decision is what matters, and this table may not exist yet on a
// database without migration 055.
export async function resolveQueueForItem(kind: string, itemId: string, resolution: Resolution, note: string): Promise<number> {
  try {
    const rows = await query(
      `update content_review_queue
          set status = 'resolved', resolved_at = now(), resolution = $3, resolution_note = $4, resolved_by = 'npm run items'
        where item_kind = $1 and item_id = $2 and status = 'open' returning id`,
      [kind, itemId, resolution, note.slice(0, 1000)]
    );
    return rows.length;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[content-review-queue] could not resolve ${kind} ${itemId}: ${(err as Error).message}`);
    return 0;
  }
}
