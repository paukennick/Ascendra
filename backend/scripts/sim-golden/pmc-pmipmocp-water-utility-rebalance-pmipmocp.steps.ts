// REQ-321: golden paths for the PMI-PMOCP band of PFMP/pfmp-water-utility-rebalance
// (PMIPMOCP/water-utility-rebalance-pmipmocp.band.json): the same case and paths, registered to the
// PMIPMOCP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pfmp-rebalance.steps.ts";

export const ENTRY = { course: "PMIPMOCP", slug: "water-utility-rebalance-pmipmocp" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
