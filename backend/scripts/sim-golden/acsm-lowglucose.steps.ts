// REQ-338: golden paths for the personal trainer (ACSMCPT) band of NASMCPT/cpt-low-glucose-mid-intervals band (ACSMCPT/acsm-low-glucose-mid-intervals.band.json):
// the same case and paths as its base, registered to this course's objective.
//
//   npm run sim:golden -- steps acsm-lowglucose
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cpt-lowglucose.steps.ts";

export const ENTRY = { course: "ACSMCPT", slug: "acsm-low-glucose-mid-intervals" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
