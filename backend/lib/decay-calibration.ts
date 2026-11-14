// REQ-301 (mastery decay, step 1): the calibration report. Predicted recall
// against what learners actually got right, read from the shadow columns on
// review_log (migration 085). Read-only SQL, no learner text, nothing
// written. Run it with `npm run decay:calibration [-- --days 90 --source live
// --version fsrs6-k-v1 --json]`; docs/decay-shadow-calibration.md says how to
// read it.
//
// What counts: unaided reviews only (assisted = false). An answer given with
// the choices on screen tests recognition, not recall, and the model does not
// treat it as evidence either (lib/memory-model.ts fitPersonalScale).
// "Recalled" is the fit's own definition: the verdict was not a miss (correct
// or partial), so the report scores what the model was fitted to; the share
// of fully correct answers is printed beside it.
//
// The bar from the design (docs/mastery-decay-design.md, step 2): ship
// predicted recall to learners only when it is within about 5 points of
// observed recall. Every prediction here was made BEFORE its outcome from
// earlier reviews only, so each one is a held-out prediction for that
// learner; a population refit (step 2) must still hold out whole learners.
// Over-prediction (the model says more than learners recalled) is the
// dishonest direction, and the report names it.
import { courseCategoryOf, type CourseCategory } from "@/lib/billing-config";
import { MEMORY_MODEL_VERSION } from "@/lib/decay-shadow";

export const CALIBRATION_BAR_POINTS = 5;
// Fewer reviews than this in a slice is too few to say anything: one more
// answer would move the observed rate by half a point.
export const CALIBRATION_MIN_N = 200;

// Predicted-recall buckets: coarse below 70%, 5 points wide above 80% where
// nearly every review falls. width_bucket(predicted, BUCKET_EDGES) is the
// index into BUCKET_LABELS.
export const BUCKET_EDGES = [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95] as const;
export const BUCKET_LABELS = ["under 50%", "50-60%", "60-70%", "70-80%", "80-85%", "85-90%", "90-95%", "95-100%"] as const;

export const CALIBRATION_SQL = `
select width_bucket(l.predicted_recall, array[${BUCKET_EDGES.join(", ")}]::numeric[]) as bucket,
       l.model_source as source,
       l.model_fit_stage as stage,
       l.model_goal as goal,
       l.model_level as level,
       case when t.user_id is not null then 'own' else coalesce(ec.slug, '') end as cat,
       coalesce(es.slug, '') as sub,
       count(*)::int as n,
       count(distinct l.user_id)::int as learners,
       sum(l.predicted_recall)::float8 as sum_pred,
       count(*) filter (where l.verdict <> 'incorrect')::int as recalled,
       count(*) filter (where l.verdict = 'correct')::int as strict_correct,
       sum(power(l.predicted_recall - (case when l.verdict <> 'incorrect' then 1 else 0 end), 2))::float8 as sq_err
  from review_log l
  left join objectives o on o.id = l.objective_id
  left join course_units u on u.id = o.unit_id
  left join subject_tracks t on t.id = u.track_id
  left join education_subcategories es on es.id = t.subcategory_id
  left join education_categories ec on ec.id = es.category_id
 where l.predicted_recall is not null
   and not l.assisted
   and l.model_version = $2
   and l.reviewed_at >= now() - make_interval(days => $1)
   and ($3::text is null or l.model_source = $3)
 group by 1, 2, 3, 4, 5, 6, 7
`;

export interface CalibrationCell {
  bucket: number;
  source: string;
  stage: string;
  goal: string;
  level: string;
  cat: string;
  sub: string;
  n: number;
  learners: number; // distinct learners in THIS cell (not additive across cells)
  sumPred: number;
  recalled: number;
  strictCorrect: number;
  sqErr: number;
}

export interface Slice {
  label: string;
  n: number;
  meanPredicted: number; // 0..1
  observed: number; // share recalled (not a miss)
  strictCorrect: number; // share fully correct
  gapPoints: number; // predicted minus observed, in points: positive = the model is too optimistic
  brier: number;
  brierBaseline: number; // Brier of always predicting the slice's own observed rate
  verdict: "too_few" | "within_bar" | "over_predicts" | "under_predicts";
}

export interface CalibrationReport {
  days: number;
  version: string;
  source: string | null;
  overall: Slice;
  expectedCalibrationError: number; // points: n-weighted mean |gap| over the predicted-recall buckets
  byBucket: Slice[];
  byStage: Slice[];
  byGoal: Slice[];
  byLevel: Slice[];
  byCategory: Slice[];
  bySource: Slice[];
}

type Run = (sql: string, params: unknown[]) => Promise<Array<Record<string, unknown>>>;

export function toCells(rows: Array<Record<string, unknown>>): CalibrationCell[] {
  return rows.map((r) => ({
    bucket: Number(r.bucket ?? 0),
    source: String(r.source ?? ""),
    stage: String(r.stage ?? ""),
    goal: String(r.goal ?? ""),
    level: String(r.level ?? ""),
    cat: String(r.cat ?? ""),
    sub: String(r.sub ?? ""),
    n: Number(r.n ?? 0),
    learners: Number(r.learners ?? 0),
    sumPred: Number(r.sum_pred ?? 0),
    recalled: Number(r.recalled ?? 0),
    strictCorrect: Number(r.strict_correct ?? 0),
    sqErr: Number(r.sq_err ?? 0),
  }));
}

export function sliceOf(label: string, cells: CalibrationCell[]): Slice {
  let n = 0;
  let sumPred = 0;
  let recalled = 0;
  let strict = 0;
  let sq = 0;
  for (const c of cells) {
    n += c.n;
    sumPred += c.sumPred;
    recalled += c.recalled;
    strict += c.strictCorrect;
    sq += c.sqErr;
  }
  const observed = n ? recalled / n : 0;
  const meanPredicted = n ? sumPred / n : 0;
  const gapPoints = (meanPredicted - observed) * 100;
  let verdict: Slice["verdict"] = "too_few";
  if (n >= CALIBRATION_MIN_N) {
    verdict = Math.abs(gapPoints) <= CALIBRATION_BAR_POINTS ? "within_bar" : gapPoints > 0 ? "over_predicts" : "under_predicts";
  }
  return {
    label,
    n,
    meanPredicted,
    observed,
    strictCorrect: n ? strict / n : 0,
    gapPoints,
    brier: n ? sq / n : 0,
    brierBaseline: observed * (1 - observed),
    verdict,
  };
}

function group(cells: CalibrationCell[], key: (c: CalibrationCell) => string, order?: (a: string, b: string) => number): Slice[] {
  const m = new Map<string, CalibrationCell[]>();
  for (const c of cells) {
    const k = key(c);
    const list = m.get(k);
    if (list) list.push(c);
    else m.set(k, [c]);
  }
  return [...m.entries()].sort(([a], [b]) => (order ? order(a, b) : a.localeCompare(b))).map(([k, v]) => sliceOf(k, v));
}

const STAGE_ORDER = ["starting", "learning", "fitted"];
const LEVEL_ORDER = ["new", "some", "experienced"];
const rank = (list: string[]) => (a: string, b: string) => list.indexOf(a) - list.indexOf(b);

// The plan category a stored course belongs to (clinical, it_cloud, ...). The
// SQL returns the raw taxonomy slugs; the map lives in code
// (lib/billing-config.ts), so this report never carries a second list. A
// learner's own course is "own course".
export function categoryLabel(cat: string, sub: string): string {
  if (cat === "own") return "own course";
  return (cat ? courseCategoryOf(cat, sub || null) : "other") satisfies CourseCategory;
}

export function buildReport(cells: CalibrationCell[], meta: { days: number; version: string; source: string | null }): CalibrationReport {
  const byBucket = group(cells, (c) => String(c.bucket), (a, b) => Number(a) - Number(b)).map((s) => ({
    ...s,
    label: BUCKET_LABELS[Number(s.label)] ?? s.label,
  }));
  const total = cells.reduce((a, c) => a + c.n, 0);
  const ece = total ? byBucket.reduce((a, s) => a + s.n * Math.abs(s.gapPoints), 0) / total : 0;
  return {
    days: meta.days,
    version: meta.version,
    source: meta.source,
    overall: sliceOf("all unaided reviews", cells),
    expectedCalibrationError: ece,
    byBucket,
    byStage: group(cells, (c) => c.stage, rank(STAGE_ORDER)),
    byGoal: group(cells, (c) => c.goal),
    byLevel: group(cells, (c) => c.level, rank(LEVEL_ORDER)),
    byCategory: group(cells, (c) => categoryLabel(c.cat, c.sub)),
    bySource: group(cells, (c) => c.source),
  };
}

export async function calibrationReport(
  run: Run,
  opts: { days?: number; version?: string; source?: "live" | "backfill" | null } = {}
): Promise<CalibrationReport> {
  const days = opts.days ?? 90;
  const version = opts.version ?? MEMORY_MODEL_VERSION;
  const source = opts.source ?? null;
  const rows = await run(CALIBRATION_SQL, [days, version, source]);
  return buildReport(toCells(rows), { days, version, source });
}

const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
const signed = (x: number) => `${x >= 0 ? "+" : ""}${x.toFixed(1)}`;
const VERDICT: Record<Slice["verdict"], string> = {
  too_few: `too few to judge (under ${CALIBRATION_MIN_N})`,
  within_bar: `within ${CALIBRATION_BAR_POINTS} points`,
  over_predicts: "model too optimistic",
  under_predicts: "model too pessimistic",
};

function line(s: Slice): string {
  return (
    `  ${s.label.padEnd(26)} n=${String(s.n).padStart(6)}  predicted ${pct(s.meanPredicted).padStart(6)}  ` +
    `observed ${pct(s.observed).padStart(6)}  gap ${signed(s.gapPoints).padStart(5)} pts  ` +
    `Brier ${s.brier.toFixed(3)} (flat ${s.brierBaseline.toFixed(3)})  ${VERDICT[s.verdict]}`
  );
}

export function formatCalibration(r: CalibrationReport): string {
  const out = [
    `Mastery decay shadow mode: predicted vs observed recall, unaided reviews in the last ${r.days} days`,
    `Model ${r.version}${r.source ? `, ${r.source} rows only` : ""}. SHADOW DATA: nothing here is shown to learners.`,
    `Observed = answer was not a miss (correct or partial). Gap = predicted minus observed; positive means the model is too optimistic.`,
    `Bar for step 2: within ${CALIBRATION_BAR_POINTS} points, judged on slices of at least ${CALIBRATION_MIN_N} reviews.`,
    "",
  ];
  if (r.overall.n === 0) return [...out, "  No predicted reviews in this window yet."].join("\n");
  out.push(line(r.overall), `  Expected calibration error over the buckets: ${r.expectedCalibrationError.toFixed(1)} pts`, "");
  const section = (title: string, rows: Slice[]) => out.push(title, ...rows.map(line), "");
  section("By predicted recall (is 90% really 90%?)", r.byBucket);
  section("By what the personal fit rests on", r.byStage);
  section("By course goal", r.byGoal);
  section("By course level", r.byLevel);
  section("By course category (clinical is the one to watch)", r.byCategory);
  section("By how the row was made (backfill used today's goal and level, not the ones then)", r.bySource);
  return out.join("\n").trimEnd();
}
