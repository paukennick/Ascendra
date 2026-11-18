// REQ-335: golden paths for the AI901 band of AWSMLA/loan-data-bias
// (AI901/loan-data-bias-ai901.band.json): the same case and paths, registered to the
// AI901 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-mla-bias.steps.ts";

export const ENTRY = { course: "AI901", slug: "loan-data-bias-ai901" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
