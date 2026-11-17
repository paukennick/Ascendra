// REQ-316: golden paths for the AWS CloudOps Engineer Associate (SOA-C03) band of AWSDVA/canary-rollback-dlq
// (AWSSOA/canary-rollback-dlq-soa.band.json): the same case and paths, registered to the
// AWSSOA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-dva-canary.steps.ts";

export const ENTRY = { course: "AWSSOA", slug: "canary-rollback-dlq-soa" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
