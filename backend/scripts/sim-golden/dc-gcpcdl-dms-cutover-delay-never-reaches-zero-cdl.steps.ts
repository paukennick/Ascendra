// REQ-335: golden paths for the GCPCDL band of GCPDBE/dms-cutover-delay-never-reaches-zero
// (GCPCDL/dms-cutover-delay-never-reaches-zero-cdl.band.json): the same case and paths, registered to the
// GCPCDL objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpdbe-dms.steps.ts";

export const ENTRY = { course: "GCPCDL", slug: "dms-cutover-delay-never-reaches-zero-cdl" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
