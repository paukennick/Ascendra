// REQ-334: golden paths for the LPN/VN band of NCLEXPN/rehab-resident-no-use-to-anyone
// (LPNVN/rehab-resident-no-use-to-anyone-lpn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps lpn-band-suicide
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sens-pn-report.steps.ts";

export const ENTRY = { course: "LPNVN", slug: "rehab-resident-no-use-to-anyone-lpn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
