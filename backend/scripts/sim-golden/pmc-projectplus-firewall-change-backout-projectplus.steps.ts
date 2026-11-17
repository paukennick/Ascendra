// REQ-321: golden paths for the Project+ (PK0-005) band of SECPLUS/firewall-change-backout
// (PROJECTPLUS/firewall-change-backout-projectplus.band.json): the same case and paths, registered to the
// PROJECTPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./secplus-change.steps.ts";

export const ENTRY = { course: "PROJECTPLUS", slug: "firewall-change-backout-projectplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
