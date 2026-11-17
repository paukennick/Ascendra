// REQ-321: golden paths for the Cloud+ (CV0-004) band of AWSSOA/rds-update-without-where-pitr
// (CLOUDPLUS/rds-update-without-where-pitr-cloudplus.band.json): the same case and paths, registered to the
// CLOUDPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./soa-pitr.steps.ts";

export const ENTRY = { course: "CLOUDPLUS", slug: "rds-update-without-where-pitr-cloudplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
