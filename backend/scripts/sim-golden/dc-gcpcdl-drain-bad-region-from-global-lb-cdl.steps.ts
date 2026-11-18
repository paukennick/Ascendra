// REQ-335: golden paths for the GCPCDL band of GCPDEVOPS/drain-bad-region-from-global-lb
// (GCPCDL/drain-bad-region-from-global-lb-cdl.band.json): the same case and paths, registered to the
// GCPCDL objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpdevops-drain.steps.ts";

export const ENTRY = { course: "GCPCDL", slug: "drain-bad-region-from-global-lb-cdl" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
