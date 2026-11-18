// REQ-334: golden paths for the ADN-RN band of NCLEXRN/oxytocin-tachysystole-late-decels
// (ADNRN/oxytocin-tachysystole-late-decels-adn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps adn-band-fhr
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./rn-fhr.steps.ts";

export const ENTRY = { course: "ADNRN", slug: "oxytocin-tachysystole-late-decels-adn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
