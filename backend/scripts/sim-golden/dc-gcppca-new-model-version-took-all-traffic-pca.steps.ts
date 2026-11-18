// REQ-335: golden paths for the GCPPCA band of GCPMLE/new-model-version-took-all-traffic
// (GCPPCA/new-model-version-took-all-traffic-pca.band.json): the same case and paths, registered to the
// GCPPCA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpmle-trafficsplit.steps.ts";

export const ENTRY = { course: "GCPPCA", slug: "new-model-version-took-all-traffic-pca" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
