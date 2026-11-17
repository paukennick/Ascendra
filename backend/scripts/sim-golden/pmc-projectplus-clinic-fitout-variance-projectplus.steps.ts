// REQ-321: golden paths for the Project+ (PK0-005) band of PMP/pmp-clinic-fitout-schedule-variance
// (PROJECTPLUS/clinic-fitout-variance-projectplus.band.json): the same case and paths, registered to the
// PROJECTPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pmp-fitout.steps.ts";

export const ENTRY = { course: "PROJECTPLUS", slug: "clinic-fitout-variance-projectplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
