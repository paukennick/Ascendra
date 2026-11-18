// REQ-334: golden paths for the LPN/VN band of NCLEXPN/head-strike-on-apixaban
// (LPNVN/head-strike-on-apixaban-lpn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps lpn-band-icp
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pn-icp.steps.ts";

export const ENTRY = { course: "LPNVN", slug: "head-strike-on-apixaban-lpn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
