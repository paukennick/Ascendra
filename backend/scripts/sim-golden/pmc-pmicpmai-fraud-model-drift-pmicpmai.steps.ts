// REQ-321: golden paths for the PMI-CPMAI band of AWSMLA/fraud-model-drift
// (PMICPMAI/fraud-model-drift-pmicpmai.band.json): the same case and paths, registered to the
// PMICPMAI objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-mla-drift.steps.ts";

export const ENTRY = { course: "PMICPMAI", slug: "fraud-model-drift-pmicpmai" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
