// REQ-338: golden paths for the AEMT (NREMTAEMT) band of NREMTEMT/emt-low-sugar-now-says-no band (NREMTAEMT/aemt-low-sugar-now-says-no.band.json):
// the same case and paths as its base, registered to this course's objective.
//
//   npm run sim:golden -- steps aemt-refusal
import type { StepsSpec } from "./steps.ts";
import { paths } from "./emt-refusal.steps.ts";

export const ENTRY = { course: "NREMTAEMT", slug: "aemt-low-sugar-now-says-no" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
