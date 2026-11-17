// REQ-321: golden paths for the Cloud+ (CV0-004) band of GCPACE/cloud-run-bad-revision-rollback
// (CLOUDPLUS/cloud-run-bad-revision-rollback-cloudplus.band.json): the same case and paths, registered to the
// CLOUDPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpace-run.steps.ts";

export const ENTRY = { course: "CLOUDPLUS", slug: "cloud-run-bad-revision-rollback-cloudplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
