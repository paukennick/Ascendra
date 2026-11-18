// REQ-334: golden paths for the ADN-RN band of NCLEXRN/postop-fever-150-graves-meds-stopped
// (ADNRN/postop-fever-150-graves-meds-stopped-adn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps adn-band-storm
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./rn-storm.steps.ts";

export const ENTRY = { course: "ADNRN", slug: "postop-fever-150-graves-meds-stopped-adn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
