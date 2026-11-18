// REQ-333: golden paths for the CMPCBS band of PFMP/pfmp-water-utility-rebalance
// (CMPCBS/water-utility-rebalance-cmpcbs.band.json): the same case and paths, registered to the
// CMPCBS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pfmp-rebalance.steps.ts";

export const ENTRY = { course: "CMPCBS", slug: "water-utility-rebalance-cmpcbs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
