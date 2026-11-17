// REQ-329 (docs/sims.md 22.36): golden paths for the FNPAANP band of FNPANCC/clinic-widower-thoughts-right-now
// (FNPAANP/clinic-widower-thoughts-right-now-fnp-clinical.band.json): the same case and paths, registered to this course's objective.
//   npm run sim:golden -- steps sens-fnp-acute-clinical
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sens-fnp-acute.steps.ts";

export const ENTRY = { course: "FNPAANP", slug: "clinic-widower-thoughts-right-now-fnp-clinical" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
