// REQ-315: golden paths for the CCRN (Adult) band of ADNRN/pca-oversedation-naloxone
// (CCRNADULT/pca-oversedation-naloxone-ccrn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps ccrn-band-opioid
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./adn-opioid.steps.ts";

export const ENTRY = { course: "CCRNADULT", slug: "pca-oversedation-naloxone-ccrn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
