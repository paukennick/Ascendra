// REQ-338: golden paths for the EMT (NREMTEMT) band of NREMTEMR/emr-line-down-on-the-car band (NREMTEMT/emt-line-down-on-the-car.band.json):
// the same case and paths as its base, registered to this course's objective.
//
//   npm run sim:golden -- steps emt-wire
import type { StepsSpec } from "./steps.ts";
import { paths } from "./emr-wire.steps.ts";

export const ENTRY = { course: "NREMTEMT", slug: "emt-line-down-on-the-car" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
