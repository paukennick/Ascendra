// REQ-315: golden paths for the NCLEX-PN band of LPNVN/ltc-pressure-injury-infection
// (NCLEXPN/ltc-pressure-injury-infection-nclexpn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps pn-band-wound
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./lpn-wound.steps.ts";

export const ENTRY = { course: "NCLEXPN", slug: "ltc-pressure-injury-infection-nclexpn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
