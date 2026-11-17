// REQ-315: golden paths for the NCLEX-RN band of CMSRN/delegation-morning-assignment
// (NCLEXRN/delegation-morning-assignment-nclexrn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps rn-band-delegate
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./cmsrn-delegate.steps.ts";

export const ENTRY = { course: "NCLEXRN", slug: "delegation-morning-assignment-nclexrn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
