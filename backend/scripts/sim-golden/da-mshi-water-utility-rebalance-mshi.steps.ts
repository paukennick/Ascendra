// REQ-333: golden paths for the MSHI band of PFMP/pfmp-water-utility-rebalance
// (MSHI/water-utility-rebalance-mshi.band.json): the same case and paths, registered to the
// MSHI objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pfmp-rebalance.steps.ts";

export const ENTRY = { course: "MSHI", slug: "water-utility-rebalance-mshi" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
