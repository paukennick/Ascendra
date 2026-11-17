// REQ-315: golden paths for the NCLEX-PN band of LPNVN/ltc-insulin-hypoglycemia
// (NCLEXPN/ltc-insulin-hypoglycemia-nclexpn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps pn-band-hypo
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./lpn-hypo.steps.ts";

export const ENTRY = { course: "NCLEXPN", slug: "ltc-insulin-hypoglycemia-nclexpn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
