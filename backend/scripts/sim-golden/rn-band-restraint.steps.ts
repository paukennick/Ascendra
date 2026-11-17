// REQ-323: golden paths for the NCLEX-RN band of CMSRN/delirium-night-prn-restraint-order
// (NCLEXRN/delirium-night-prn-restraint-order-nclexrn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps rn-band-restraint
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./cmsrn-restraint.steps.ts";

export const ENTRY = { course: "NCLEXRN", slug: "delirium-night-prn-restraint-order-nclexrn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
