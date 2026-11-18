// REQ-334: golden paths for the ADN-RN band of NCLEXRN/after-amputation-im-done
// (ADNRN/after-amputation-im-done-adn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps adn-band-suicide
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sens-rn-suicide.steps.ts";

export const ENTRY = { course: "ADNRN", slug: "after-amputation-im-done-adn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
