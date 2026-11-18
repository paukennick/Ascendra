// REQ-336: golden paths for the PMIRMP band of PMISP/hospital-wing-monte-carlo-milestone
// (PMIRMP/hospital-wing-monte-carlo-milestone-rmp.band.json): the same case and paths, registered to the
// PMIRMP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./isp-pmisp-risk.steps.ts";

export const ENTRY = { course: "PMIRMP", slug: "hospital-wing-monte-carlo-milestone-rmp" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
