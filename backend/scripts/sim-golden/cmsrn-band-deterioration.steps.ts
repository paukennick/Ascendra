// REQ-323: golden paths for the CMSRN band of NCLEXRN/med-surg-deterioration-sbar
// (CMSRN/med-surg-deterioration-sbar-cmsrn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps cmsrn-band-deterioration
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./rn-deterioration.steps.ts";

export const ENTRY = { course: "CMSRN", slug: "med-surg-deterioration-sbar-cmsrn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
