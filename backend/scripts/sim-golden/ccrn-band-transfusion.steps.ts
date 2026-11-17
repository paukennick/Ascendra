// REQ-315: golden paths for the CCRN (Adult) band of NCLEXRN/post-op-transfusion-reaction
// (CCRNADULT/post-op-transfusion-reaction-ccrn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps ccrn-band-transfusion
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./rn-transfusion.steps.ts";

export const ENTRY = { course: "CCRNADULT", slug: "post-op-transfusion-reaction-ccrn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
