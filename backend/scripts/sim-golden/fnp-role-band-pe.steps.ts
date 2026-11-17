// REQ-326 (sims-health-4, docs/sims.md 22.34): golden paths for the band of FNPAANP/clinic-calf-ache-after-flight-now-breathless
// (FNPANCC/clinic-calf-ache-after-flight-now-breathless-fnp-role.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps fnp-role-band-pe
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./fnp-pe.steps.ts";

export const ENTRY = { course: "FNPANCC", slug: "clinic-calf-ache-after-flight-now-breathless-fnp-role" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
