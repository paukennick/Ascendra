import { query, withTransaction } from "@/lib/db";
import { isActive } from "@/lib/progress-sql";

// REQ-100: course readiness from the same per-objective evidence that
// decides mastery (mastery_detail, migration 031), rolled up with the exam
// blueprint's domain weights (course_units.weight, seeded from each vendor's
// published exam guide -- see the source comments in supabase/seed).
//
// Three numbers, kept apart on purpose so a learner with little evidence is
// never shown as ready:
//   coverage   blueprint-weighted share of objectives with any evidence
//   accuracy   blueprint-weighted weighted accuracy on what was practiced
//   readiness  blueprint-weighted mean readiness score over ALL objectives;
//              an objective with no evidence scores 0, and thin evidence
//              is discounted (readiness_full_evidence)
// The status gates on coverage first. Thresholds come from
// mastery_model_params so they are tuned in one place.
//
// REQ-117 (Audit 3 T2, T3, T8): readiness tells the same story as levels and
// the plan, and falls with absence.
//   - An objective's readiness is its score x retention (review_state(),
//     migration 045: 1 up to its review's due date, then the FSRS power
//     forgetting curve), so time away lowers it whatever the amount of
//     evidence. It used to stay put until the evidence weight itself decayed
//     below readiness_full_evidence (89% "ready" after 60 days away).
//   - It is capped at readiness_unconfirmed_cap (0.6) until the objective is
//     Independent or above AND kept (confirmed at a due review, unaided) AND
//     not due to re-check. A learner whose levels are all Guided used to read
//     92% ready.
//   - "ready" also needs readiness_min_kept_share (0.7) of the blueprint
//     kept: one cram session read "ready" on day 0 with nothing kept.

export interface ReadinessParams {
  minCoverage: number;
  readyScore: number;
  readyCoverage: number;
  minKeptShare?: number;
  unconfirmedCap?: number;
}

export const DEFAULT_READINESS_PARAMS: Required<ReadinessParams> = {
  minCoverage: 0.5,
  readyScore: 0.75,
  readyCoverage: 0.9,
  minKeptShare: 0.7,
  unconfirmedCap: 0.6,
};

const CONFIRMED_LEVELS: ReadonlySet<string> = new Set(["Independent", "Transfer-ready"]);

export interface ReadinessUnitInput {
  id: string;
  title: string;
  weight: number | string | null;
}

export interface ReadinessObjectiveInput {
  unitId: string;
  // null when the learner has no evidence on the objective
  weightedAccuracy: number | string | null;
  readinessScore: number | string | null;
  // REQ-117: the live level, review_state()'s kept / recheck_due / retention.
  status?: string | null;
  kept?: string | null;
  recheckDue?: boolean | null;
  retention?: number | string | null;
}

// Confirmed = Independent or above, kept at a due review, not due to re-check.
export function isConfirmed(o: ReadinessObjectiveInput): boolean {
  return CONFIRMED_LEVELS.has(o.status ?? "") && o.kept === "kept" && o.recheckDue !== true;
}

// One objective's readiness (0-1), REQ-117.
export function objectiveReadiness(o: ReadinessObjectiveInput, params: ReadinessParams = DEFAULT_READINESS_PARAMS): number {
  const cap = params.unconfirmedCap ?? DEFAULT_READINESS_PARAMS.unconfirmedCap;
  const retention = o.retention == null ? 1 : Math.min(1, Math.max(0, Number(o.retention)));
  const r = Number(o.readinessScore ?? 0) * retention;
  return isConfirmed(o) ? r : Math.min(r, cap);
}

export type ReadinessStatus = "no_evidence" | "not_enough_evidence" | "building" | "ready";

export interface DomainReadiness {
  unitId: string;
  title: string;
  weight: number | null;
  objectives: number;
  practiced: number;
  coveragePercent: number;
  accuracyPercent: number | null;
  readinessPercent: number;
  keptPercent: number;
}

export interface CourseReadiness {
  blueprintWeighted: boolean;
  status: ReadinessStatus;
  readinessPercent: number;
  coveragePercent: number;
  accuracyPercent: number | null;
  // REQ-117: blueprint-weighted share confirmed (kept at a due review, at
  // Independent or above, not due to re-check).
  keptPercent: number;
  objectives: number;
  practiced: number;
  focusUnitId: string | null;
  domains: DomainReadiness[];
}

const pct = (x: number) => Math.round(x * 100);

// REQ-220 (FAIL-1136): SQL for "this track's unit weights are only our study
// emphasis, not a vendor blueprint": the track has a credential exam and that
// exam records no weighted domain (the seed leaves exam_domains unweighted
// for a credential marked domainWeights: "study_emphasis", e.g. the CNA
// course). A track with no exam keeps the old rule. `st` is subject_tracks.
export const STUDY_EMPHASIS_WEIGHTS_SQL = `(st.credential_exam_id is not null and not exists (
    select 1 from exam_domains ed where ed.exam_id = st.credential_exam_id and ed.weight_percent > 0))`;

export async function weightsAreExamBlueprint(trackId: string): Promise<boolean> {
  const rows = await query<{ emphasis: boolean }>(
    `select ${STUDY_EMPHASIS_WEIGHTS_SQL} as emphasis from subject_tracks st where st.id = $1`,
    [trackId]
  );
  return !rows[0]?.emphasis;
}

export function rollupReadiness(
  units: ReadinessUnitInput[],
  objectives: ReadinessObjectiveInput[],
  params: ReadinessParams = DEFAULT_READINESS_PARAMS,
  // REQ-220: false when the weights are not a real exam blueprint; the
  // course is then rolled up per objective and never shown as "% of exam".
  examBlueprint = true
): CourseReadiness {
  const byUnit = new Map<string, ReadinessObjectiveInput[]>();
  for (const o of objectives) {
    const list = byUnit.get(o.unitId) ?? [];
    list.push(o);
    byUnit.set(o.unitId, list);
  }
  const populated = units.filter((u) => (byUnit.get(u.id)?.length ?? 0) > 0);
  // Fewer than two weighted domains (an MSCS week plan, a user track) means
  // there is no blueprint: every objective counts the same instead.
  const blueprintWeighted = examBlueprint && populated.filter((u) => u.weight != null && Number(u.weight) > 0).length >= 2;

  const domains: DomainReadiness[] = [];
  let wSum = 0;
  let readiness = 0;
  let coverage = 0;
  let accW = 0;
  let acc = 0;
  let kept = 0;
  let focus: { id: string; gap: number } | null = null;
  for (const u of populated) {
    const objs = byUnit.get(u.id)!;
    const practicedObjs = objs.filter((o) => o.weightedAccuracy != null);
    const unitCoverage = practicedObjs.length / objs.length;
    const unitReadiness = objs.reduce((s, o) => s + objectiveReadiness(o, params), 0) / objs.length;
    const unitKept = objs.filter(isConfirmed).length / objs.length;
    const unitAccuracy = practicedObjs.length
      ? practicedObjs.reduce((s, o) => s + Number(o.weightedAccuracy), 0) / practicedObjs.length
      : null;
    const weight = u.weight == null ? null : Number(u.weight);
    domains.push({
      unitId: u.id,
      title: u.title,
      weight,
      objectives: objs.length,
      practiced: practicedObjs.length,
      coveragePercent: pct(unitCoverage),
      accuracyPercent: unitAccuracy == null ? null : pct(unitAccuracy),
      readinessPercent: pct(unitReadiness),
      keptPercent: pct(unitKept),
    });
    // An unweighted unit inside a blueprinted course is outside the scored
    // exam (e.g. an unscored "emerging topics" section) and does not count.
    const w = blueprintWeighted ? (weight != null && weight > 0 ? weight : 0) : objs.length;
    if (w <= 0) continue;
    wSum += w;
    readiness += w * unitReadiness;
    coverage += w * unitCoverage;
    kept += w * unitKept;
    if (unitAccuracy != null) {
      accW += w;
      acc += w * unitAccuracy;
    }
    const gap = w * (1 - unitReadiness);
    if (!focus || gap > focus.gap) focus = { id: u.id, gap };
  }

  const courseReadiness = wSum ? readiness / wSum : 0;
  const courseCoverage = wSum ? coverage / wSum : 0;
  const courseKept = wSum ? kept / wSum : 0;
  const practiced = objectives.filter((o) => o.weightedAccuracy != null).length;
  let status: ReadinessStatus;
  if (practiced === 0) status = "no_evidence";
  else if (courseCoverage < params.minCoverage) status = "not_enough_evidence";
  else if (
    courseReadiness >= params.readyScore &&
    courseCoverage >= params.readyCoverage &&
    courseKept >= (params.minKeptShare ?? DEFAULT_READINESS_PARAMS.minKeptShare)
  )
    status = "ready";
  else status = "building";

  return {
    blueprintWeighted,
    status,
    readinessPercent: pct(courseReadiness),
    coveragePercent: pct(courseCoverage),
    accuracyPercent: accW ? pct(acc / accW) : null,
    keptPercent: pct(courseKept),
    objectives: objectives.length,
    practiced,
    focusUnitId: focus && focus.gap > 0 ? focus.id : null,
    domains,
  };
}

export async function readinessParams(): Promise<ReadinessParams> {
  const rows = await query<{ name: string; value: number }>(
    `select name, value from mastery_model_params
      where name in ('readiness_min_coverage', 'readiness_ready_score', 'readiness_ready_coverage',
                     'readiness_min_kept_share', 'readiness_unconfirmed_cap')`
  );
  const v = Object.fromEntries(rows.map((r) => [r.name, Number(r.value)]));
  return {
    minCoverage: v.readiness_min_coverage ?? DEFAULT_READINESS_PARAMS.minCoverage,
    readyScore: v.readiness_ready_score ?? DEFAULT_READINESS_PARAMS.readyScore,
    readyCoverage: v.readiness_ready_coverage ?? DEFAULT_READINESS_PARAMS.readyCoverage,
    minKeptShare: v.readiness_min_kept_share ?? DEFAULT_READINESS_PARAMS.minKeptShare,
    unconfirmedCap: v.readiness_unconfirmed_cap ?? DEFAULT_READINESS_PARAMS.unconfirmedCap,
  };
}

// Computed live (not from stored mastery rows) so evidence ageing shows up
// without a recompute. The caller has already checked the track is visible.
export async function courseReadiness(trackId: string, userId: string): Promise<CourseReadiness> {
  const units = await query<{ id: string; title: string; weight: number | null }>(
    // Retired units/objectives (REQ-102, migration 033: an outgoing exam
    // version) are not part of the exam any more, so they don't count.
    `select id, title, weight from course_units cu where track_id = $1 and ${isActive("cu")} order by sort_order`,
    [trackId]
  );
  // Perf audit HIGH-1: the planner's JIT compile cost more than the query on
  // this per-objective lateral read; off for this transaction only.
  const objectives = await withTransaction((tx) => tx.query("select set_config('jit', 'off', true)").then(() => tx.query<{
    unit_id: string;
    weighted_accuracy: number | null;
    readiness_score: number | null;
    status: string | null;
    kept: string | null;
    recheck_due: boolean | null;
    retention: number | null;
  }>(
    `select o.unit_id, d.weighted_accuracy, d.readiness_score, d.status::text as status,
            rs.kept, rs.recheck_due, rs.retention
       from objectives o
       join course_units cu on cu.id = o.unit_id
       left join lateral mastery_detail($2, o.id) d on true
       left join lateral review_state($2, o.id) rs on true
      where cu.track_id = $1 and ${isActive("cu")} and ${isActive("o")}`,
    [trackId, userId]
  )));
  return rollupReadiness(
    units,
    objectives.map((o) => ({
      unitId: o.unit_id,
      weightedAccuracy: o.weighted_accuracy,
      readinessScore: o.readiness_score,
      status: o.status,
      kept: o.kept,
      recheckDue: o.recheck_due,
      retention: o.retention,
    })),
    await readinessParams(),
    await weightsAreExamBlueprint(trackId)
  );
}
