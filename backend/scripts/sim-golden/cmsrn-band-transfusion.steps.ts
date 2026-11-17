// REQ-323: golden paths for the CMSRN band of NCLEXRN/post-op-transfusion-reaction
// (CMSRN/post-op-transfusion-reaction-cmsrn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps cmsrn-band-transfusion
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./rn-transfusion.steps.ts";

export const ENTRY = { course: "CMSRN", slug: "post-op-transfusion-reaction-cmsrn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
