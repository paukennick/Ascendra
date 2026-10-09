// REQ-078/084: exam readiness. Certification units carry the vendor's
// published domain weight; a flat objective count treats a 6% domain the
// same as a 24% one. This weights each unit's mastered share by its exam
// weight -- the number that actually tracks a pass. Returns null when
// fewer than two units carry a positive weight (nothing meaningful to
// weight), and normalises by the weights' own sum so an outline whose
// rows don't total exactly 100 (ABPTS CCS publishes 85) isn't skewed.
export interface WeightedUnit {
  weight?: number | string | null;
  total_objectives?: number | null;
  mastered_objectives?: number | null;
}

export function examReadiness(units: WeightedUnit[] | null | undefined): number | null {
  if (!units) return null;
  const weighted = units.filter(
    (u) => u.weight != null && Number(u.weight) > 0 && (u.total_objectives ?? 0) > 0
  );
  if (weighted.length < 2) return null;
  const totalWeight = weighted.reduce((sum, u) => sum + Number(u.weight), 0);
  if (totalWeight <= 0) return null;
  const score = weighted.reduce(
    (sum, u) => sum + Number(u.weight) * ((u.mastered_objectives ?? 0) / (u.total_objectives ?? 1)),
    0
  );
  return Math.round((score / totalWeight) * 100);
}
