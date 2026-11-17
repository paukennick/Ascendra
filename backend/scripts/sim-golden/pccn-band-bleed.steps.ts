// REQ-323: golden paths for the PCCN band of CMSRN/postop-hemorrhage-early-signs
// (PCCN/postop-hemorrhage-early-signs-pccn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps pccn-band-bleed
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./cmsrn-bleed.steps.ts";

export const ENTRY = { course: "PCCN", slug: "postop-hemorrhage-early-signs-pccn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
