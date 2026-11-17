// REQ-315: golden paths for the NPTE-PT band of DPT/parkinson-freezing-session
// (NPTEPT/parkinson-freezing-session-npte.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps npte-band-parkinson
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dpt-parkinson.steps.ts";

export const ENTRY = { course: "NPTEPT", slug: "parkinson-freezing-session-npte" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
