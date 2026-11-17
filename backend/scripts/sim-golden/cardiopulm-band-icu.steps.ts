// REQ-323: golden paths for the cardiovascular and pulmonary specialty band of DPT/icu-early-mobility
// (ABPTSCCS/icu-early-mobility-cardiopulm.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps cardiopulm-band-icu
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dpt-icu.steps.ts";

export const ENTRY = { course: "ABPTSCCS", slug: "icu-early-mobility-cardiopulm" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
