// REQ-311: golden paths for the CSM band of the PSM I release-before-Review
// Sprint (CSM/csm-sprint-release-before-review.band.json): the same paths.
import type { StepsSpec } from "./steps.ts";
import { spec as base } from "./psm-release.steps.ts";

export const ENTRY = { course: "CSM", slug: "csm-sprint-release-before-review" };

export function spec(): StepsSpec {
  return { ...base(), slug: ENTRY.slug };
}
