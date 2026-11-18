// REQ-335: golden paths for the AZ400 band of AZ140/bad-image-version-spreads-to-new-hosts
// (AZ400/bad-image-version-spreads-to-new-hosts-az400.band.json): the same case and paths, registered to the
// AZ400 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./az140-image.steps.ts";

export const ENTRY = { course: "AZ400", slug: "bad-image-version-spreads-to-new-hosts-az400" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
