// REQ-320: golden paths for the GCPPCA band of GCPACE/public-bucket-customer-exports
// (GCPPCA/public-bucket-customer-exports-pca.band.json): the same case and paths, registered to the
// GCPPCA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpace-bucket.steps.ts";

export const ENTRY = { course: "GCPPCA", slug: "public-bucket-customer-exports-pca" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
