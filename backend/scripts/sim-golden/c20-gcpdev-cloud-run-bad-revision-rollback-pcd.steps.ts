// REQ-320: golden paths for the GCPDEV band of GCPACE/cloud-run-bad-revision-rollback
// (GCPDEV/cloud-run-bad-revision-rollback-pcd.band.json): the same case and paths, registered to the
// GCPDEV objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpace-run.steps.ts";

export const ENTRY = { course: "GCPDEV", slug: "cloud-run-bad-revision-rollback-pcd" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
