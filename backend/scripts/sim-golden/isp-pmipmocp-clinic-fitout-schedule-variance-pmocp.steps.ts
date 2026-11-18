// REQ-336: golden paths for the PMIPMOCP band of PMP/pmp-clinic-fitout-schedule-variance
// (PMIPMOCP/clinic-fitout-schedule-variance-pmocp.band.json): the same case and paths, registered to the
// PMIPMOCP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pmp-fitout.steps.ts";

export const ENTRY = { course: "PMIPMOCP", slug: "clinic-fitout-schedule-variance-pmocp" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
