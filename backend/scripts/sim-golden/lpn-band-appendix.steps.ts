// REQ-334: golden paths for the LPN/VN band of NCLEXPN/clinic-belly-pain-moved-right
// (LPNVN/clinic-belly-pain-moved-right-lpn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps lpn-band-appendix
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pn-appendix.steps.ts";

export const ENTRY = { course: "LPNVN", slug: "clinic-belly-pain-moved-right-lpn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
