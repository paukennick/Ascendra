// REQ-321: golden paths for the DataAI (DY0-001) band of AWSMLA/loan-data-bias
// (DATAAI/loan-data-bias-dataai.band.json): the same case and paths, registered to the
// DATAAI objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-mla-bias.steps.ts";

export const ENTRY = { course: "DATAAI", slug: "loan-data-bias-dataai" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
