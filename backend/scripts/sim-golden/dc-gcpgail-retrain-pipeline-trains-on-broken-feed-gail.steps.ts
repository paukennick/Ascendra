// REQ-335: golden paths for the GCPGAIL band of GCPMLE/retrain-pipeline-trains-on-broken-feed
// (GCPGAIL/retrain-pipeline-trains-on-broken-feed-gail.band.json): the same case and paths, registered to the
// GCPGAIL objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpmle-validate.steps.ts";

export const ENTRY = { course: "GCPGAIL", slug: "retrain-pipeline-trains-on-broken-feed-gail" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
