// REQ-321: golden paths for the PMI-SP band of PMP/pmp-clinic-fitout-schedule-variance
// (PMISP/clinic-fitout-variance-pmisp.band.json): the same case and paths, registered to the
// PMISP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pmp-fitout.steps.ts";

export const ENTRY = { course: "PMISP", slug: "clinic-fitout-variance-pmisp" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
