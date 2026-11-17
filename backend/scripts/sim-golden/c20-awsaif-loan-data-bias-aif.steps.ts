// REQ-320: golden paths for the AWSAIF band of AWSMLA/loan-data-bias
// (AWSAIF/loan-data-bias-aif.band.json): the same case and paths, registered to the
// AWSAIF objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-mla-bias.steps.ts";

export const ENTRY = { course: "AWSAIF", slug: "loan-data-bias-aif" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
