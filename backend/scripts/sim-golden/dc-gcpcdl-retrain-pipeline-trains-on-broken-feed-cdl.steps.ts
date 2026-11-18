// REQ-335: golden paths for the GCPCDL band of GCPMLE/retrain-pipeline-trains-on-broken-feed
// (GCPCDL/retrain-pipeline-trains-on-broken-feed-cdl.band.json): the same case and paths, registered to the
// GCPCDL objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpmle-validate.steps.ts";

export const ENTRY = { course: "GCPCDL", slug: "retrain-pipeline-trains-on-broken-feed-cdl" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
