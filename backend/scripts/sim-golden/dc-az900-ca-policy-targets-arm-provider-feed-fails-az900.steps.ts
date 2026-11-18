// REQ-335: golden paths for the AZ900 band of AZ140/ca-policy-targets-arm-provider-feed-fails
// (AZ900/ca-policy-targets-arm-provider-feed-fails-az900.band.json): the same case and paths, registered to the
// AZ900 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./az140-condaccess.steps.ts";

export const ENTRY = { course: "AZ900", slug: "ca-policy-targets-arm-provider-feed-fails-az900" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
