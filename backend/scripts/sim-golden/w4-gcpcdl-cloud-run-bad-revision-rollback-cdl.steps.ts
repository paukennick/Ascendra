// REQ-316: golden paths for the Google Cloud Digital Leader band of GCPACE/cloud-run-bad-revision-rollback
// (GCPCDL/cloud-run-bad-revision-rollback-cdl.band.json): the same case and paths, registered to the
// GCPCDL objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpace-run.steps.ts";

export const ENTRY = { course: "GCPCDL", slug: "cloud-run-bad-revision-rollback-cdl" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
