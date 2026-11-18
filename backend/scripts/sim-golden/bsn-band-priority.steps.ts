// REQ-334: golden paths for the BSN-RN band of NCLEXRN/med-surg-deterioration-sbar
// (BSNRN/med-surg-deterioration-sbar-bsn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps bsn-band-priority
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./rn-deterioration.steps.ts";

export const ENTRY = { course: "BSNRN", slug: "med-surg-deterioration-sbar-bsn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
