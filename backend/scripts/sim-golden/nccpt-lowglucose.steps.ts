// REQ-338: golden paths for the personal trainer (NCCPTCPT) band of NASMCPT/cpt-low-glucose-mid-intervals band (NCCPTCPT/nccpt-low-glucose-mid-intervals.band.json):
// the same case and paths as its base, registered to this course's objective.
//
//   npm run sim:golden -- steps nccpt-lowglucose
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cpt-lowglucose.steps.ts";

export const ENTRY = { course: "NCCPTCPT", slug: "nccpt-low-glucose-mid-intervals" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
