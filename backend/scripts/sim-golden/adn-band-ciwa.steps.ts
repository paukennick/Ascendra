// REQ-334: golden paths for the ADN-RN band of NCLEXRN/alcohol-withdrawal-ciwa
// (ADNRN/alcohol-withdrawal-ciwa-adn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps adn-band-ciwa
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./rn-ciwa.steps.ts";

export const ENTRY = { course: "ADNRN", slug: "alcohol-withdrawal-ciwa-adn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
