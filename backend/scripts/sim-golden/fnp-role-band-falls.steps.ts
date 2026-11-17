// REQ-326 (sims-health-4, docs/sims.md 22.34): golden paths for the band of FNPAANP/clinic-three-falls-five-new-pills
// (FNPANCC/clinic-three-falls-five-new-pills-fnp-role.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps fnp-role-band-falls
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./fnp-falls.steps.ts";

export const ENTRY = { course: "FNPANCC", slug: "clinic-three-falls-five-new-pills-fnp-role" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
