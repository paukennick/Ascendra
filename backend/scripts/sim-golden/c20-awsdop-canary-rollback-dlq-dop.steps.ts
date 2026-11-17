// REQ-320: golden paths for the AWSDOP band of AWSDVA/canary-rollback-dlq
// (AWSDOP/canary-rollback-dlq-dop.band.json): the same case and paths, registered to the
// AWSDOP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-dva-canary.steps.ts";

export const ENTRY = { course: "AWSDOP", slug: "canary-rollback-dlq-dop" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
