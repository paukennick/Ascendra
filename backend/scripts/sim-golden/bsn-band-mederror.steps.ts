// REQ-334: golden paths for the BSN-RN band of NCLEXRN/insulin-given-to-wrong-bed
// (BSNRN/insulin-given-to-wrong-bed-bsn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps bsn-band-mederror
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./rn-mederror.steps.ts";

export const ENTRY = { course: "BSNRN", slug: "insulin-given-to-wrong-bed-bsn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
