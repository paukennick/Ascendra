// REQ-315: golden paths for the NPTE-PT band of DPT/icu-early-mobility
// (NPTEPT/icu-early-mobility-npte.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps npte-band-icu
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dpt-icu.steps.ts";

export const ENTRY = { course: "NPTEPT", slug: "icu-early-mobility-npte" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
