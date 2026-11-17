// REQ-321: golden paths for the AutoOps+ (AT0-001) band of AWSDVA/canary-rollback-dlq
// (AUTOOPSPLUS/canary-rollback-dlq-autoopsplus.band.json): the same case and paths, registered to the
// AUTOOPSPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-dva-canary.steps.ts";

export const ENTRY = { course: "AUTOOPSPLUS", slug: "canary-rollback-dlq-autoopsplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
