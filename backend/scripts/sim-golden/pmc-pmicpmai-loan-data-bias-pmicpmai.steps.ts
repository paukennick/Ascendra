// REQ-321: golden paths for the PMI-CPMAI band of AWSMLA/loan-data-bias
// (PMICPMAI/loan-data-bias-pmicpmai.band.json): the same case and paths, registered to the
// PMICPMAI objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aws-mla-bias.steps.ts";

export const ENTRY = { course: "PMICPMAI", slug: "loan-data-bias-pmicpmai" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
