// REQ-320: golden paths for the GCPDEVOPS band of GCPACE/cloud-run-bad-revision-rollback
// (GCPDEVOPS/cloud-run-bad-revision-rollback-devops.band.json): the same case and paths, registered to the
// GCPDEVOPS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpace-run.steps.ts";

export const ENTRY = { course: "GCPDEVOPS", slug: "cloud-run-bad-revision-rollback-devops" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
