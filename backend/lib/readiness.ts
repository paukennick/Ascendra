import { query } from "@/lib/db";
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

export interface ReadinessParams {
  minCoverage: number;
  readyScore: number;
  readyCoverage: number;
}

export const DEFAULT_READINESS_PARAMS: ReadinessParams = { minCoverage: 0.5, readyScore: 0.75, readyCoverage: 0.9 };

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
}

export interface CourseReadiness {
  blueprintWeighted: boolean;
  status: ReadinessStatus;
  readinessPercent: number;
  coveragePercent: number;
  accuracyPercent: number | null;
  objectives: number;
  practiced: number;
  focusUnitId: string | null;
  domains: DomainReadiness[];
}

const pct = (x: number) => Math.round(x * 100);

export function rollupReadiness(
  units: ReadinessUnitInput[],
  objectives: ReadinessObjectiveInput[],
  params: ReadinessParams = DEFAULT_READINESS_PARAMS
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
  const blueprintWeighted = populated.filter((u) => u.weight != null && Number(u.weight) > 0).length >= 2;

  const domains: DomainReadiness[] = [];
  let wSum = 0;
  let readiness = 0;
  let coverage = 0;
  let accW = 0;
  let acc = 0;
  let focus: { id: string; gap: number } | null = null;
  for (const u of populated) {
    const objs = byUnit.get(u.id)!;
    const practicedObjs = objs.filter((o) => o.weightedAccuracy != null);
    const unitCoverage = practicedObjs.length / objs.length;
    const unitReadiness = objs.reduce((s, o) => s + Number(o.readinessScore ?? 0), 0) / objs.length;
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
    });
    // An unweighted unit inside a blueprinted course is outside the scored
    // exam (e.g. an unscored "emerging topics" section) and does not count.
    const w = blueprintWeighted ? (weight != null && weight > 0 ? weight : 0) : objs.length;
    if (w <= 0) continue;
    wSum += w;
    readiness += w * unitReadiness;
    coverage += w * unitCoverage;
    if (unitAccuracy != null) {
      accW += w;
      acc += w * unitAccuracy;
    }
    const gap = w * (1 - unitReadiness);
    if (!focus || gap > focus.gap) focus = { id: u.id, gap };
  }

  const courseReadiness = wSum ? readiness / wSum : 0;
  const courseCoverage = wSum ? coverage / wSum : 0;
  const practiced = objectives.filter((o) => o.weightedAccuracy != null).length;
  let status: ReadinessStatus;
  if (practiced === 0) status = "no_evidence";
  else if (courseCoverage < params.minCoverage) status = "not_enough_evidence";
  else if (courseReadiness >= params.readyScore && courseCoverage >= params.readyCoverage) status = "ready";
  else status = "building";

  return {
    blueprintWeighted,
    status,
    readinessPercent: pct(courseReadiness),
    coveragePercent: pct(courseCoverage),
    accuracyPercent: accW ? pct(acc / accW) : null,
    objectives: objectives.length,
    practiced,
    focusUnitId: focus && focus.gap > 0 ? focus.id : null,
    domains,
  };
}

export async function readinessParams(): Promise<ReadinessParams> {
  const rows = await query<{ name: string; value: number }>(
    `select name, value from mastery_model_params
      where name in ('readiness_min_coverage', 'readiness_ready_score', 'readiness_ready_coverage')`
  );
  const v = Object.fromEntries(rows.map((r) => [r.name, Number(r.value)]));
  return {
    minCoverage: v.readiness_min_coverage ?? DEFAULT_READINESS_PARAMS.minCoverage,
    readyScore: v.readiness_ready_score ?? DEFAULT_READINESS_PARAMS.readyScore,
    readyCoverage: v.readiness_ready_coverage ?? DEFAULT_READINESS_PARAMS.readyCoverage,
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
  const objectives = await query<{ unit_id: string; weighted_accuracy: number | null; readiness_score: number | null }>(
    `select o.unit_id, d.weighted_accuracy, d.readiness_score
       from objectives o
       join course_units cu on cu.id = o.unit_id
       left join lateral mastery_detail($2, o.id) d on true
      where cu.track_id = $1 and ${isActive("cu")} and ${isActive("o")}`,
    [trackId, userId]
  );
  return rollupReadiness(
    units,
    objectives.map((o) => ({ unitId: o.unit_id, weightedAccuracy: o.weighted_accuracy, readinessScore: o.readiness_score })),
    await readinessParams()
  );
}
