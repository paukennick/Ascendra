// REQ-334: golden paths for the LPN/VN band of NCLEXPN/warfarin-inr-high-tarry-stool
// (LPNVN/warfarin-inr-high-tarry-stool-lpn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps lpn-band-warfarin
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pn-warfarin.steps.ts";

export const ENTRY = { course: "LPNVN", slug: "warfarin-inr-high-tarry-stool-lpn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
