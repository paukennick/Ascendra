// REQ-338: golden paths for the personal trainer (ACECPT) band of NASMCPT/cpt-low-glucose-mid-intervals band (ACECPT/ace-low-glucose-mid-intervals.band.json):
// the same case and paths as its base, registered to this course's objective.
//
//   npm run sim:golden -- steps ace-lowglucose
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cpt-lowglucose.steps.ts";

export const ENTRY = { course: "ACECPT", slug: "ace-low-glucose-mid-intervals" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
