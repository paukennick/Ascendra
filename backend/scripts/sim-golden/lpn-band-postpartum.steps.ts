// REQ-334: golden paths for the LPN/VN band of NCLEXPN/postpartum-check-boggy-fundus
// (LPNVN/postpartum-check-boggy-fundus-lpn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps lpn-band-postpartum
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pn-postpartum.steps.ts";

export const ENTRY = { course: "LPNVN", slug: "postpartum-check-boggy-fundus-lpn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
