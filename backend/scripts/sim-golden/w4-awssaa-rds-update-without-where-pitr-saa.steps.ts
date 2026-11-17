// REQ-316: golden paths for the AWS Solutions Architect Associate (SAA-C03) band of AWSSOA/rds-update-without-where-pitr
// (AWSSAA/rds-update-without-where-pitr-saa.band.json): the same case and paths, registered to the
// AWSSAA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./soa-pitr.steps.ts";

export const ENTRY = { course: "AWSSAA", slug: "rds-update-without-where-pitr-saa" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
