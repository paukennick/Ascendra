// REQ-323: golden paths for the NCLEX-RN band of PCCN/femoral-access-retroperitoneal-bleed
// (NCLEXRN/femoral-access-retroperitoneal-bleed-nclexrn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps rn-band-access
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pccn-access.steps.ts";

export const ENTRY = { course: "NCLEXRN", slug: "femoral-access-retroperitoneal-bleed-nclexrn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
