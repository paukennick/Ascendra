// REQ-315: golden paths for the NCLEX-RN band of ADNRN/heart-failure-pulmonary-edema
// (NCLEXRN/heart-failure-pulmonary-edema-nclexrn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps rn-band-overload
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./adn-hf.steps.ts";

export const ENTRY = { course: "NCLEXRN", slug: "heart-failure-pulmonary-edema-nclexrn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
