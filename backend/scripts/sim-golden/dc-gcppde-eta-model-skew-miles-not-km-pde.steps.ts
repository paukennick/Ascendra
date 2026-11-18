// REQ-335: golden paths for the GCPPDE band of GCPMLE/eta-model-skew-miles-not-km
// (GCPPDE/eta-model-skew-miles-not-km-pde.band.json): the same case and paths, registered to the
// GCPPDE objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpmle-skew.steps.ts";

export const ENTRY = { course: "GCPPDE", slug: "eta-model-skew-miles-not-km-pde" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
