// REQ-323: golden paths for the neurologic specialty band of DPT/dizziness-central-red-flags
// (ABPTSNCS/dizziness-central-red-flags-neuro.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps neuro-band-central
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dpt-central.steps.ts";

export const ENTRY = { course: "ABPTSNCS", slug: "dizziness-central-red-flags-neuro" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
