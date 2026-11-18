// REQ-335: golden paths for the AWSAIF band of AWSMLA/fraud-model-drift
// (AWSAIF/fraud-model-drift-aif.band.json): the same case and paths, registered to the
// AWSAIF objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-mla-drift.steps.ts";

export const ENTRY = { course: "AWSAIF", slug: "fraud-model-drift-aif" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
