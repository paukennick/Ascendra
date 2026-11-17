// REQ-320: golden paths for the AWSDOP band of AWSSOA/stack-update-rollback-failed
// (AWSDOP/stack-update-rollback-failed-dop.band.json): the same case and paths, registered to the
// AWSDOP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-soa-cfn.steps.ts";

export const ENTRY = { course: "AWSDOP", slug: "stack-update-rollback-failed-dop" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
