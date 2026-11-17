// REQ-326 (sims-health-4, docs/sims.md 22.34): golden paths for the band of FNPANCC/clinic-swollen-lip-years-on-lisinopril
// (FNPAANP/clinic-swollen-lip-years-on-lisinopril-fnp-clinical.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps fnp-clinical-band-angio
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./fnp-angio.steps.ts";

export const ENTRY = { course: "FNPAANP", slug: "clinic-swollen-lip-years-on-lisinopril-fnp-clinical" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
