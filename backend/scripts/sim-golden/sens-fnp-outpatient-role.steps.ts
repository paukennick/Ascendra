// REQ-329 (docs/sims.md 22.36): golden paths for the FNPANCC band of FNPAANP/clinic-depression-follow-up-item-nine
// (FNPANCC/clinic-depression-follow-up-item-nine-fnp-role.band.json): the same case and paths, registered to this course's objective.
//   npm run sim:golden -- steps sens-fnp-outpatient-role
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sens-fnp-outpatient.steps.ts";

export const ENTRY = { course: "FNPANCC", slug: "clinic-depression-follow-up-item-nine-fnp-role" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
