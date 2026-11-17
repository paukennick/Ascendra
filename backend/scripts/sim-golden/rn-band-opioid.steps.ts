// REQ-315: golden paths for the NCLEX-RN band of ADNRN/pca-oversedation-naloxone
// (NCLEXRN/pca-oversedation-naloxone-nclexrn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps rn-band-opioid
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./adn-opioid.steps.ts";

export const ENTRY = { course: "NCLEXRN", slug: "pca-oversedation-naloxone-nclexrn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
