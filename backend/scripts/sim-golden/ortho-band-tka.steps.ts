// REQ-323: golden paths for the orthopedic specialty band of DPT/tka-gait-dvt-red-flag
// (ABPTSOCS/tka-gait-dvt-red-flag-ortho.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps ortho-band-tka
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dpt-tka.steps.ts";

export const ENTRY = { course: "ABPTSOCS", slug: "tka-gait-dvt-red-flag-ortho" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
