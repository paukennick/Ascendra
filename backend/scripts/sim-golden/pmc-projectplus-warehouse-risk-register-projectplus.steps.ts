// REQ-321: golden paths for the Project+ (PK0-005) band of PMIRMP/pmirmp-warehouse-risk-register
// (PROJECTPLUS/warehouse-risk-register-projectplus.band.json): the same case and paths, registered to the
// PROJECTPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pmirmp-register.steps.ts";

export const ENTRY = { course: "PROJECTPLUS", slug: "warehouse-risk-register-projectplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
