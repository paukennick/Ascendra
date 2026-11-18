// REQ-335: golden paths for the GCPPCA band of GCPSEC/cmek-old-version-scheduled-for-destruction
// (GCPPCA/cmek-old-version-scheduled-for-destruction-pca.band.json): the same case and paths, registered to the
// GCPPCA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpsec-cmek.steps.ts";

export const ENTRY = { course: "GCPPCA", slug: "cmek-old-version-scheduled-for-destruction-pca" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
