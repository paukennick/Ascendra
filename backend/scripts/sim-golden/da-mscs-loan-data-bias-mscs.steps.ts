// REQ-333: golden paths for the MSCS band of AWSMLA/loan-data-bias
// (MSCS/loan-data-bias-mscs.band.json): the same case and paths, registered to the
// MSCS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-mla-bias.steps.ts";

export const ENTRY = { course: "MSCS", slug: "loan-data-bias-mscs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
