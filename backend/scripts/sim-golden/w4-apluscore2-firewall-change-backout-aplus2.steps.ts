// REQ-316: golden paths for the A+ Core 2 (220-1202) band of SECPLUS/firewall-change-backout
// (APLUS_CORE2/firewall-change-backout-aplus2.band.json): the same case and paths, registered to the
// APLUS_CORE2 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./secplus-change.steps.ts";

export const ENTRY = { course: "APLUS_CORE2", slug: "firewall-change-backout-aplus2" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
