// REQ-338: golden paths for the personal trainer (NSCACPT) band of NASMCPT/cpt-low-glucose-mid-intervals band (NSCACPT/nscacpt-low-glucose-mid-intervals.band.json):
// the same case and paths as its base, registered to this course's objective.
//
//   npm run sim:golden -- steps nscacpt-lowglucose
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cpt-lowglucose.steps.ts";

export const ENTRY = { course: "NSCACPT", slug: "nscacpt-low-glucose-mid-intervals" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
