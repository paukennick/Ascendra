// REQ-333: golden paths for the CMPCBS band of SECPLUS/firewall-change-backout
// (CMPCBS/firewall-change-backout-cmpcbs.band.json): the same case and paths, registered to the
// CMPCBS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./secplus-change.steps.ts";

export const ENTRY = { course: "CMPCBS", slug: "firewall-change-backout-cmpcbs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
