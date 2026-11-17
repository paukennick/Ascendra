// REQ-320: golden paths for the GCPSEC band of GCPACE/public-bucket-customer-exports
// (GCPSEC/public-bucket-customer-exports-sec.band.json): the same case and paths, registered to the
// GCPSEC objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpace-bucket.steps.ts";

export const ENTRY = { course: "GCPSEC", slug: "public-bucket-customer-exports-sec" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
