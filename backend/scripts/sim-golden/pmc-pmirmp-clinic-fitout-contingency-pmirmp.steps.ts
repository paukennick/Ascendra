// REQ-321: golden paths for the PMI-RMP band of PMP/pmp-clinic-fitout-schedule-variance
// (PMIRMP/clinic-fitout-contingency-pmirmp.band.json): the same case and paths, registered to the
// PMIRMP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pmp-fitout.steps.ts";

export const ENTRY = { course: "PMIRMP", slug: "clinic-fitout-contingency-pmirmp" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
