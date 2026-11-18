// REQ-335: golden paths for the GCPPDE band of GCPDBE/dms-cutover-delay-never-reaches-zero
// (GCPPDE/dms-cutover-delay-never-reaches-zero-pde.band.json): the same case and paths, registered to the
// GCPPDE objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpdbe-dms.steps.ts";

export const ENTRY = { course: "GCPPDE", slug: "dms-cutover-delay-never-reaches-zero-pde" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
