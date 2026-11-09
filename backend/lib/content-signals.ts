// REQ-143: the arithmetic behind the content review queue. Pure: the
// database side (lib/content-review-queue.ts) gathers the counts, this
// decides. Thresholds live in item_quality_params (migration 055) and fall
// back to these defaults.
//
// WHY THESE RULES
//
// Reports. One report is one learner's opinion; three different learners
// reporting the same item within 30 days is a pattern worth a person's look.
// item_flags already keeps one report per learner per item, so every count
// here is distinct learners. A lower count still matters when it is a large
// share of the people who saw the item: 2 reports from 10-19 learners is
// 10-20%. Below 10 learners the rate rule never fires: 1 of 3 is 33% and
// means nothing.
//
// Correct-rate drop. The item's recent correct rate (last 14 days) is
// compared with its own baseline (the 180 days before that), counting each
// learner's FIRST answer in each window only, so one learner retrying cannot
// fill a window. It fires only when all of these hold:
//   - at least 30 baseline learners and 20 recent learners. Below that a
//     proportion is too noisy to compare (with 20 learners the 95% interval
//     around 70% is roughly +-20 points);
//   - the drop is at least 20 percentage points (an effect a reviewer would
//     care about; small drifts from a new cohort are expected);
//   - a one-sided two-proportion z-test (pooled) reaches z >= 3.09, i.e.
//     p < 0.001. The job tests every eligible item every day, so a lax
//     p < 0.05 would flag about one in twenty healthy eligible items by chance;
//     0.001 keeps chance flags rare without a per-run correction that would
//     change with catalog size.
// With today's volume (a handful of accounts) no item reaches the minimum
// samples, so the check is silent by construction.

export interface SignalParams {
  reportWindowDays: number;
  reportMinLearners: number;
  reportRate: number;
  reportRateMinReports: number;
  reportRateMinLearners: number;
  dropRecentDays: number;
  dropBaselineDays: number;
  dropMinBaseline: number;
  dropMinRecent: number;
  dropMinPoints: number;
  dropZ: number;
}

export const DEFAULT_SIGNAL_PARAMS: SignalParams = {
  reportWindowDays: 30,
  reportMinLearners: 3,
  reportRate: 0.1,
  reportRateMinReports: 2,
  reportRateMinLearners: 10,
  dropRecentDays: 14,
  dropBaselineDays: 180,
  dropMinBaseline: 30,
  dropMinRecent: 20,
  dropMinPoints: 0.2,
  dropZ: 3.09,
};

// item_quality_params name -> field.
export const PARAM_NAMES: Record<string, keyof SignalParams> = {
  signal_report_window_days: "reportWindowDays",
  signal_report_min_learners: "reportMinLearners",
  signal_report_rate: "reportRate",
  signal_report_rate_min_reports: "reportRateMinReports",
  signal_report_rate_min_learners: "reportRateMinLearners",
  signal_drop_recent_days: "dropRecentDays",
  signal_drop_baseline_days: "dropBaselineDays",
  signal_drop_min_baseline: "dropMinBaseline",
  signal_drop_min_recent: "dropMinRecent",
  signal_drop_min_points: "dropMinPoints",
  signal_drop_z: "dropZ",
};

// Floors keep a mistyped parameter from turning the job into a flood: counts
// never go below 2 (a single learner never opens a review), samples never
// below 10, and rates stay inside (0, 1].
const FLOORS: Partial<Record<keyof SignalParams, number>> = {
  reportWindowDays: 1,
  reportMinLearners: 2,
  reportRateMinReports: 2,
  reportRateMinLearners: 10,
  dropRecentDays: 1,
  dropBaselineDays: 1,
  dropMinBaseline: 10,
  dropMinRecent: 10,
  dropZ: 1.645,
};

export function signalParams(rows: { name: string; value: string | number }[]): SignalParams {
  const p: SignalParams = { ...DEFAULT_SIGNAL_PARAMS };
  for (const r of rows) {
    const key = PARAM_NAMES[r.name];
    const v = Number(r.value);
    if (!key || !Number.isFinite(v)) continue;
    if (key === "reportRate" || key === "dropMinPoints") {
      if (v > 0 && v <= 1) p[key] = v;
      continue;
    }
    const floor = FLOORS[key] ?? 0;
    if (v >= floor) p[key] = v;
  }
  return p;
}

export interface ReportCounts {
  // distinct learners who reported the item in the window
  reporters: number;
  // distinct learners who answered it in the window; null when the kind has
  // no answers to count (a lesson step)
  learners: number | null;
}

export interface ReportVerdict {
  flagged: boolean;
  rules: ("burst" | "rate")[];
  rate: number | null;
}

export function evaluateReports(c: ReportCounts, p: SignalParams = DEFAULT_SIGNAL_PARAMS): ReportVerdict {
  const rules: ReportVerdict["rules"] = [];
  if (c.reporters >= p.reportMinLearners) rules.push("burst");
  const rate = c.learners && c.learners > 0 ? c.reporters / c.learners : null;
  if (
    rate !== null &&
    c.learners! >= p.reportRateMinLearners &&
    c.reporters >= p.reportRateMinReports &&
    rate >= p.reportRate
  ) {
    rules.push("rate");
  }
  return { flagged: rules.length > 0, rules, rate };
}

export interface DropCounts {
  baselineN: number;
  baselineCorrect: number;
  recentN: number;
  recentCorrect: number;
}

export interface DropVerdict {
  flagged: boolean;
  eligible: boolean;
  baselineRate: number | null;
  recentRate: number | null;
  drop: number | null;
  z: number | null;
}

// Pooled two-proportion z for "baseline rate > recent rate". 0 when the
// pooled rate is 0 or 1 (no variance: nothing to test).
export function twoProportionZ(x1: number, n1: number, x2: number, n2: number): number {
  if (n1 <= 0 || n2 <= 0) return 0;
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const p = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  return se > 0 ? (p1 - p2) / se : 0;
}

const round = (x: number, places = 3) => Math.round(x * 10 ** places) / 10 ** places;

export function evaluateDrop(c: DropCounts, p: SignalParams = DEFAULT_SIGNAL_PARAMS): DropVerdict {
  const valid =
    [c.baselineN, c.baselineCorrect, c.recentN, c.recentCorrect].every((v) => Number.isInteger(v) && v >= 0) &&
    c.baselineCorrect <= c.baselineN &&
    c.recentCorrect <= c.recentN;
  const eligible = valid && c.baselineN >= p.dropMinBaseline && c.recentN >= p.dropMinRecent;
  if (!eligible) {
    return { flagged: false, eligible: false, baselineRate: null, recentRate: null, drop: null, z: null };
  }
  const baselineRate = c.baselineCorrect / c.baselineN;
  const recentRate = c.recentCorrect / c.recentN;
  const drop = baselineRate - recentRate;
  const z = twoProportionZ(c.baselineCorrect, c.baselineN, c.recentCorrect, c.recentN);
  // A tiny epsilon so a drop of exactly the threshold (0.8 -> 0.6) counts
  // despite floating point.
  const flagged = drop >= p.dropMinPoints - 1e-9 && z >= p.dropZ;
  return { flagged, eligible, baselineRate: round(baselineRate), recentRate: round(recentRate), drop: round(drop), z: round(z, 2) };
}
