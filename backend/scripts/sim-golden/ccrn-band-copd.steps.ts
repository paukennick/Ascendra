// REQ-315: golden paths for the CCRN (Adult) band of PCCN/copd-exacerbation-niv
// (CCRNADULT/copd-exacerbation-niv-ccrn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps ccrn-band-copd
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pccn-copd.steps.ts";

export const ENTRY = { course: "CCRNADULT", slug: "copd-exacerbation-niv-ccrn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
