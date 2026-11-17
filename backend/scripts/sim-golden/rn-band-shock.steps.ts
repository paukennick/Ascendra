// REQ-315: golden paths for the NCLEX-RN band of CCRNADULT/sepsis-to-septic-shock
// (NCLEXRN/sepsis-to-septic-shock-nclexrn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps rn-band-shock
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sepsis.steps.ts";

export const ENTRY = { course: "NCLEXRN", slug: "sepsis-to-septic-shock-nclexrn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
