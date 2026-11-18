// REQ-335: golden paths for the AWSDOP band of AWSSCS/miner-instance-evidence-before-scale-in
// (AWSDOP/miner-instance-evidence-before-scale-in-dop.band.json): the same case and paths, registered to the
// AWSDOP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./scs-forensics.steps.ts";

export const ENTRY = { course: "AWSDOP", slug: "miner-instance-evidence-before-scale-in-dop" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
