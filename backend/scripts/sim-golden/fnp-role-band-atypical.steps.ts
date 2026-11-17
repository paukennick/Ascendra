// REQ-323: golden paths for the FNP professional role band of FNPAANP/two-falls-not-herself
// (FNPANCC/two-falls-not-herself-fnp-role.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps fnp-role-band-atypical
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./fnp-atypical.steps.ts";

export const ENTRY = { course: "FNPANCC", slug: "two-falls-not-herself-fnp-role" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
