// REQ-323: golden paths for the NCLEX-RN band of CEN/hallway-head-injury-falling-gcs
// (NCLEXRN/hallway-head-injury-falling-gcs-nclexrn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps rn-band-icp
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./cen-icp.steps.ts";

export const ENTRY = { course: "NCLEXRN", slug: "hallway-head-injury-falling-gcs-nclexrn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
