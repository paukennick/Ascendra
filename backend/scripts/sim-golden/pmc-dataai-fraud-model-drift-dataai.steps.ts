// REQ-321: golden paths for the DataAI (DY0-001) band of AWSMLA/fraud-model-drift
// (DATAAI/fraud-model-drift-dataai.band.json): the same case and paths, registered to the
// DATAAI objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-mla-drift.steps.ts";

export const ENTRY = { course: "DATAAI", slug: "fraud-model-drift-dataai" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
