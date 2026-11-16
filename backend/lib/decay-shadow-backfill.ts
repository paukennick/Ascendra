// REQ-301: replay existing review_log history to compute what the memory model
// WOULD have predicted at each past review, so calibration (step 2) can start
// with the reviews already on file instead of waiting weeks for live ones.
// Run with scripts/decay-shadow-backfill.ts (`npm run decay:backfill`); DRY RUN
// BY DEFAULT: it computes and prints, and writes only with --apply.
//
// The same computation as the live write (predictShadow): each review is
// predicted from the reviews of the same learner and course that came BEFORE
// it ((reviewed_at, id) order), so a prediction never sees its own outcome or
// anything later. Differences from a live row, which is why they are marked
// model_source = 'backfill' and reported apart:
//   - the goal and level are the course's CURRENT ones (nothing stores what
//     they were then; a learner who changed them since gets the new prior);
//   - enrollment is review_schedule.enrolled_at as it stands now.
// Replay-safe: only rows with no prediction yet (model_version is null) are
// written, so a re-run, a resumed run, or a run after live rows exist never
// changes a stored prediction, whichever model version made it. A course
// history over SHADOW_MAX_HISTORY_ROWS reviews is skipped and counted, as it
// is live.
import { query, withTransaction, type TxClient } from "@/lib/db";
import {
  MEMORY_MODEL_VERSION,
  SHADOW_MAX_HISTORY_ROWS,
  asGoal,
  asLevel,
  enrolledMap,
  predictShadow,
  toShadowReview,
  type ShadowPrediction,
  type ShadowRow,
} from "@/lib/decay-shadow";

export interface BackfillOptions {
  apply: boolean;
  userId?: string | null;
  limitPairs?: number | null; // learner-course pairs to take this run (the rest on the next run)
  onProgress?: (done: number, total: number) => void;
}

export interface BackfillSummary {
  apply: boolean;
  pairs: number; // learner-course pairs with at least one unpredicted review
  rowsConsidered: number;
  rowsPredicted: number; // computed (dry run) or written (apply)
  rowsWithoutPrediction: number; // no enrollment, or the history was too long
  pairsSkippedTooLong: number;
  byStage: Record<string, number>;
  // Over the unaided rows predicted: what the report would show, so a dry run
  // says whether the data is worth a calibration at all.
  unaided: { n: number; meanPredicted: number; observed: number };
}

const PAIRS_SQL = `
select l.user_id, u.track_id
  from review_log l
  join objectives o on o.id = l.objective_id
  join course_units u on u.id = o.unit_id
 where l.scheduler is not null and l.model_version is null and l.objective_id is not null
   and ($1::uuid is null or l.user_id = $1)
 group by l.user_id, u.track_id
 order by l.user_id, u.track_id
 limit $2`;

const ROWS_SQL = `
select l.id, l.objective_id, l.reviewed_at, l.verdict::text as verdict, l.assisted, l.model_version, s.enrolled_at
  from review_log l
  join objectives o on o.id = l.objective_id
  join course_units u on u.id = o.unit_id and u.track_id = $2
  join review_schedule s on s.user_id = l.user_id and s.objective_id = l.objective_id
 where l.user_id = $1 and l.scheduler is not null
 order by l.reviewed_at, l.id
 limit $3`;

interface LoggedRow extends ShadowRow {
  id: string;
  model_version: string | null;
}

// The pure core, so a test can run it without a database: predictions for
// every row that has none, in order, from the rows before it.
export function replayCourse(
  rows: LoggedRow[],
  goal: string | null,
  level: string | null
): Array<{ id: string; prediction: ShadowPrediction | null; row: LoggedRow }> {
  const enrolled = enrolledMap(rows);
  const history = rows.map(toShadowReview);
  const out: Array<{ id: string; prediction: ShadowPrediction | null; row: LoggedRow }> = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].model_version !== null) continue;
    out.push({
      id: rows[i].id,
      row: rows[i],
      prediction: predictShadow({
        history: history.slice(0, i),
        enrolledAtMs: enrolled,
        target: { objectiveId: rows[i].objective_id, atMs: history[i].atMs },
        goal: asGoal(goal),
        level: asLevel(level),
      }),
    });
  }
  return out;
}

const WRITE_SQL = `
update review_log l
   set predicted_recall = v.predicted_recall, model_stability = v.model_stability, model_difficulty = v.model_difficulty,
       model_k = v.model_k, model_fit_stage = v.model_fit_stage, model_goal = v.model_goal, model_level = v.model_level,
       model_version = $10, model_source = 'backfill'
  from unnest($1::uuid[], $2::numeric[], $3::numeric[], $4::numeric[], $5::numeric[], $6::text[], $7::text[], $8::text[])
       as v(id, predicted_recall, model_stability, model_difficulty, model_k, model_fit_stage, model_goal, model_level)
 where l.id = v.id and l.model_version is null and l.user_id = $9`;

async function write(tx: TxClient, userId: string, items: Array<{ id: string; prediction: ShadowPrediction }>): Promise<number> {
  const p = items.map((i) => i.prediction);
  await tx.query(WRITE_SQL, [
    items.map((i) => i.id),
    p.map((x) => x.predictedRecall),
    p.map((x) => x.stability),
    p.map((x) => x.difficulty),
    p.map((x) => x.k),
    p.map((x) => x.fitStage),
    p.map((x) => x.goal),
    p.map((x) => x.level),
    userId,
    MEMORY_MODEL_VERSION,
  ]);
  return items.length;
}

export async function backfillShadow(opts: BackfillOptions): Promise<BackfillSummary> {
  const pairs = await query<{ user_id: string; track_id: string }>(PAIRS_SQL, [opts.userId ?? null, opts.limitPairs ?? 1_000_000]);
  const s: BackfillSummary = {
    apply: opts.apply,
    pairs: pairs.length,
    rowsConsidered: 0,
    rowsPredicted: 0,
    rowsWithoutPrediction: 0,
    pairsSkippedTooLong: 0,
    byStage: {},
    unaided: { n: 0, meanPredicted: 0, observed: 0 },
  };
  let sumPred = 0;
  let recalled = 0;
  for (const [i, pair] of pairs.entries()) {
    const rows = await query<LoggedRow>(ROWS_SQL, [pair.user_id, pair.track_id, SHADOW_MAX_HISTORY_ROWS + 1]);
    if (rows.length > SHADOW_MAX_HISTORY_ROWS) {
      s.pairsSkippedTooLong++;
      s.rowsConsidered += rows.filter((r) => r.model_version === null).length;
      s.rowsWithoutPrediction += rows.filter((r) => r.model_version === null).length;
      continue;
    }
    const prof = await query<{ goal: string | null; level: string | null }>(
      `select goal, level from learner_course_profiles where user_id = $1 and track_id = $2`,
      [pair.user_id, pair.track_id]
    );
    const done = replayCourse(rows, prof[0]?.goal ?? null, prof[0]?.level ?? null);
    const ready = done.filter((d): d is { id: string; prediction: ShadowPrediction; row: LoggedRow } => d.prediction !== null);
    s.rowsConsidered += done.length;
    s.rowsWithoutPrediction += done.length - ready.length;
    for (const d of ready) {
      s.byStage[d.prediction.fitStage] = (s.byStage[d.prediction.fitStage] ?? 0) + 1;
      if (!d.row.assisted) {
        s.unaided.n++;
        sumPred += d.prediction.predictedRecall;
        if (d.row.verdict !== "incorrect") recalled++;
      }
    }
    s.rowsPredicted += ready.length;
    // One transaction per learner-course: a stop part way leaves whole pairs
    // done and the rest for the next run.
    if (opts.apply && ready.length) await withTransaction((tx) => write(tx, pair.user_id, ready));
    opts.onProgress?.(i + 1, pairs.length);
  }
  if (s.unaided.n) {
    s.unaided.meanPredicted = sumPred / s.unaided.n;
    s.unaided.observed = recalled / s.unaided.n;
  }
  return s;
}

export function formatBackfill(s: BackfillSummary): string {
  const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
  const lines = [
    s.apply ? "decay shadow backfill: APPLIED" : "decay shadow backfill: DRY RUN (nothing written; add --apply)",
    `  learner-course pairs with unpredicted reviews: ${s.pairs}`,
    `  reviews considered: ${s.rowsConsidered}; ${s.apply ? "written" : "would be written"}: ${s.rowsPredicted}; no prediction possible: ${s.rowsWithoutPrediction}` +
      (s.pairsSkippedTooLong ? ` (${s.pairsSkippedTooLong} pairs skipped: history over ${SHADOW_MAX_HISTORY_ROWS} reviews)` : ""),
    `  by fit stage: ${Object.entries(s.byStage).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}`,
  ];
  if (s.unaided.n) {
    lines.push(
      `  unaided reviews predicted: ${s.unaided.n}; mean predicted ${pct(s.unaided.meanPredicted)} vs observed ${pct(s.unaided.observed)} (observed = not a miss)`
    );
  }
  lines.push("  Rows are marked model_source 'backfill' (today's goal and level, not the ones then). Re-running is safe: stored predictions are never overwritten.");
  return lines.join("\n");
}
