// REQ-320: golden paths for the GCPDEV band of GCPACE/public-bucket-customer-exports
// (GCPDEV/public-bucket-customer-exports-pcd.band.json): the same case and paths, registered to the
// GCPDEV objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpace-bucket.steps.ts";

export const ENTRY = { course: "GCPDEV", slug: "public-bucket-customer-exports-pcd" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
