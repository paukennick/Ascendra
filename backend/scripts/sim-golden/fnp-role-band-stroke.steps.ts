// REQ-323: golden paths for the FNP (professional role) band of FNPAANP/clinic-severe-bp-stroke-signs
// (FNPANCC/clinic-severe-bp-stroke-signs-fnp-role.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps fnp-role-band-stroke
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./fnp-stroke.steps.ts";

export const ENTRY = { course: "FNPANCC", slug: "clinic-severe-bp-stroke-signs-fnp-role" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
