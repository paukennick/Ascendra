// REQ-321: golden paths for the CAPM (2023 outline) band of PMP/pmp-clinic-fitout-schedule-variance
// (CAPM/clinic-fitout-variance-capm.band.json): the same case and paths, registered to the
// CAPM objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pmp-fitout.steps.ts";

export const ENTRY = { course: "CAPM", slug: "clinic-fitout-variance-capm" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
