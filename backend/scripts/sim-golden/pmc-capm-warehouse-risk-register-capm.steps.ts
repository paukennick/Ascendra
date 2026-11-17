// REQ-321: golden paths for the CAPM band of PMIRMP/pmirmp-warehouse-risk-register
// (CAPM/warehouse-risk-register-capm.band.json): the same case and paths, registered to the
// CAPM objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pmirmp-register.steps.ts";

export const ENTRY = { course: "CAPM", slug: "warehouse-risk-register-capm" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
