// REQ-315: golden paths for the CCRN (Adult) band of ADNRN/heart-failure-pulmonary-edema
// (CCRNADULT/heart-failure-pulmonary-edema-ccrn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps ccrn-band-hf
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./adn-hf.steps.ts";

export const ENTRY = { course: "CCRNADULT", slug: "heart-failure-pulmonary-edema-ccrn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
