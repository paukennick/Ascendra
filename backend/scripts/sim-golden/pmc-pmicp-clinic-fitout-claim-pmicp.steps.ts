// REQ-321: golden paths for the PMI-CP band of PMP/pmp-clinic-fitout-schedule-variance
// (PMICP/clinic-fitout-claim-pmicp.band.json): the same case and paths, registered to the
// PMICP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pmp-fitout.steps.ts";

export const ENTRY = { course: "PMICP", slug: "clinic-fitout-claim-pmicp" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
