// REQ-316: golden paths for the Network+ (N10-009) band of SECPLUS/firewall-change-backout
// (NETWORKPLUS/firewall-change-backout-netplus.band.json): the same case and paths, registered to the
// NETWORKPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./secplus-change.steps.ts";

export const ENTRY = { course: "NETWORKPLUS", slug: "firewall-change-backout-netplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
