// REQ-315: golden paths for the NCLEX-RN band of PCCN/copd-exacerbation-niv
// (NCLEXRN/copd-exacerbation-niv-nclexrn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps rn-band-copd
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pccn-copd.steps.ts";

export const ENTRY = { course: "NCLEXRN", slug: "copd-exacerbation-niv-nclexrn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
