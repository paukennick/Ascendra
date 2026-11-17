// REQ-323: golden paths for the neurologic specialty band of DPT/parkinson-freezing-session
// (ABPTSNCS/parkinson-freezing-session-neuro.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps neuro-band-parkinson
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dpt-parkinson.steps.ts";

export const ENTRY = { course: "ABPTSNCS", slug: "parkinson-freezing-session-neuro" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
