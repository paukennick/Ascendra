// REQ-323: golden paths for the PCCN band of CCRNADULT/sepsis-to-septic-shock
// (PCCN/sepsis-to-septic-shock-pccn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps pccn-band-sepsis
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sepsis.steps.ts";

export const ENTRY = { course: "PCCN", slug: "sepsis-to-septic-shock-pccn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
