// REQ-315: golden paths for the NCLEX-RN band of CMSRN/postop-hemorrhage-early-signs
// (NCLEXRN/postop-hemorrhage-early-signs-nclexrn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps rn-band-bleed
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./cmsrn-bleed.steps.ts";

export const ENTRY = { course: "NCLEXRN", slug: "postop-hemorrhage-early-signs-nclexrn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
