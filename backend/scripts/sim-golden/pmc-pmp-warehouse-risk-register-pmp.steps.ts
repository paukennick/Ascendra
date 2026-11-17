// REQ-321: golden paths for the PMP band of PMIRMP/pmirmp-warehouse-risk-register
// (PMP/warehouse-risk-register-pmp.band.json): the same case and paths, registered to the
// PMP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pmirmp-register.steps.ts";

export const ENTRY = { course: "PMP", slug: "warehouse-risk-register-pmp" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
