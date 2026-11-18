// REQ-336: golden paths for the PGMP band of PMIRMP/airport-baggage-residual-secondary-risks
// (PGMP/airport-baggage-residual-secondary-risks-pgmp.band.json): the same case and paths, registered to the
// PGMP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./isp-rmp-monitor.steps.ts";

export const ENTRY = { course: "PGMP", slug: "airport-baggage-residual-secondary-risks-pgmp" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
