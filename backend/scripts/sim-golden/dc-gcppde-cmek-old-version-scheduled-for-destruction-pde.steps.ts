// REQ-335: golden paths for the GCPPDE band of GCPSEC/cmek-old-version-scheduled-for-destruction
// (GCPPDE/cmek-old-version-scheduled-for-destruction-pde.band.json): the same case and paths, registered to the
// GCPPDE objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpsec-cmek.steps.ts";

export const ENTRY = { course: "GCPPDE", slug: "cmek-old-version-scheduled-for-destruction-pde" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
