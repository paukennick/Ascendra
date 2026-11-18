// REQ-335: golden paths for the GCPACE band of GCPSEC/cmek-old-version-scheduled-for-destruction
// (GCPACE/cmek-old-version-scheduled-for-destruction-ace.band.json): the same case and paths, registered to the
// GCPACE objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpsec-cmek.steps.ts";

export const ENTRY = { course: "GCPACE", slug: "cmek-old-version-scheduled-for-destruction-ace" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
