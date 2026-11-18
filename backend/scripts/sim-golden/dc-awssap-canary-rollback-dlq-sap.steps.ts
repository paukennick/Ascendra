// REQ-335: golden paths for the AWSSAP band of AWSDVA/canary-rollback-dlq
// (AWSSAP/canary-rollback-dlq-sap.band.json): the same case and paths, registered to the
// AWSSAP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-dva-canary.steps.ts";

export const ENTRY = { course: "AWSSAP", slug: "canary-rollback-dlq-sap" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
