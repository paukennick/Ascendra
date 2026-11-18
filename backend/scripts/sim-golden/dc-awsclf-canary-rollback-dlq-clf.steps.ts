// REQ-335: golden paths for the AWSCLF band of AWSDVA/canary-rollback-dlq
// (AWSCLF/canary-rollback-dlq-clf.band.json): the same case and paths, registered to the
// AWSCLF objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-dva-canary.steps.ts";

export const ENTRY = { course: "AWSCLF", slug: "canary-rollback-dlq-clf" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
