// REQ-315: golden paths for the NPTE-PT band of DPT/stroke-balance-fall-risk
// (NPTEPT/stroke-balance-fall-risk-npte.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps npte-band-stroke
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dpt-stroke.steps.ts";

export const ENTRY = { course: "NPTEPT", slug: "stroke-balance-fall-risk-npte" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
