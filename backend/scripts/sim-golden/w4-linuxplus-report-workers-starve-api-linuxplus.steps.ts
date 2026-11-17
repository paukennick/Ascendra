// REQ-316: golden paths for the Linux+ (XK0-006) band of LFCS/report-workers-starve-api
// (LINUXPLUS/report-workers-starve-api-linuxplus.band.json): the same case and paths, registered to the
// LINUXPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./lfcs-proc.steps.ts";

export const ENTRY = { course: "LINUXPLUS", slug: "report-workers-starve-api-linuxplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
