// REQ-335: golden paths for the GCPPCA band of GCPDBE/dms-cutover-delay-never-reaches-zero
// (GCPPCA/dms-cutover-delay-never-reaches-zero-pca.band.json): the same case and paths, registered to the
// GCPPCA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpdbe-dms.steps.ts";

export const ENTRY = { course: "GCPPCA", slug: "dms-cutover-delay-never-reaches-zero-pca" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
