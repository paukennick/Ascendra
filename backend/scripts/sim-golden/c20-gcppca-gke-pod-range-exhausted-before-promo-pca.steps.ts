// REQ-320: golden paths for the GCPPCA band of GCPNET/gke-pod-range-exhausted-before-promo
// (GCPPCA/gke-pod-range-exhausted-before-promo-pca.band.json): the same case and paths, registered to the
// GCPPCA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpnet-podrange.steps.ts";

export const ENTRY = { course: "GCPPCA", slug: "gke-pod-range-exhausted-before-promo-pca" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
