// REQ-335: golden paths for the GCPGAIL band of GCPMLE/eta-model-skew-miles-not-km
// (GCPGAIL/eta-model-skew-miles-not-km-gail.band.json): the same case and paths, registered to the
// GCPGAIL objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpmle-skew.steps.ts";

export const ENTRY = { course: "GCPGAIL", slug: "eta-model-skew-miles-not-km-gail" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
