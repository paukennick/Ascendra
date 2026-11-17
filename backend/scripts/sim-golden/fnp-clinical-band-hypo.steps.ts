// REQ-323: golden paths for the FNP (clinical practice) band of FNPANCC/clinic-sulfonylurea-hypoglycemia
// (FNPAANP/clinic-sulfonylurea-hypoglycemia-fnp-clinical.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps fnp-clinical-band-hypo
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./fnp-hypo.steps.ts";

export const ENTRY = { course: "FNPAANP", slug: "clinic-sulfonylurea-hypoglycemia-fnp-clinical" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
