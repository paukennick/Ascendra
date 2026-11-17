// REQ-323: golden paths for the NPTE-PTA band of DPT/icu-early-mobility
// (NPTEPTA/icu-early-mobility-pta.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps pta-band-icu
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dpt-icu.steps.ts";

export const ENTRY = { course: "NPTEPTA", slug: "icu-early-mobility-pta" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
