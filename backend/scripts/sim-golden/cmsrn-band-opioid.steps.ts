// REQ-323: golden paths for the CMSRN band of ADNRN/pca-oversedation-naloxone
// (CMSRN/pca-oversedation-naloxone-cmsrn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps cmsrn-band-opioid
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./adn-opioid.steps.ts";

export const ENTRY = { course: "CMSRN", slug: "pca-oversedation-naloxone-cmsrn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
