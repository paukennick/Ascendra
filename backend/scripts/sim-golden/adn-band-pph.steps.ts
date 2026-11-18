// REQ-334: golden paths for the ADN-RN band of NCLEXRN/postpartum-hemorrhage-atony
// (ADNRN/postpartum-hemorrhage-atony-adn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps adn-band-pph
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./rn-pph.steps.ts";

export const ENTRY = { course: "ADNRN", slug: "postpartum-hemorrhage-atony-adn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
