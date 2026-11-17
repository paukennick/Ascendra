// REQ-323: golden paths for the geriatric specialty band of DPT/stroke-balance-fall-risk
// (ABPTSGCS/stroke-balance-fall-risk-geri.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps geri-band-stroke
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dpt-stroke.steps.ts";

export const ENTRY = { course: "ABPTSGCS", slug: "stroke-balance-fall-risk-geri" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
