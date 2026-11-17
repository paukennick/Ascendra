// REQ-316: golden paths for the Google Cloud Digital Leader band of GCPACE/public-bucket-customer-exports
// (GCPCDL/public-bucket-customer-exports-cdl.band.json): the same case and paths, registered to the
// GCPCDL objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpace-bucket.steps.ts";

export const ENTRY = { course: "GCPCDL", slug: "public-bucket-customer-exports-cdl" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
