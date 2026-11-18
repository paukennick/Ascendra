// REQ-338: golden paths for the personal trainer (ACSMCPT) band of NASMCPT/cpt-twenty-four-weeks-leaking-fluid band (ACSMCPT/acsm-twenty-four-weeks-leaking-fluid.band.json):
// the same case and paths as its base, registered to this course's objective.
//
//   npm run sim:golden -- steps acsm-prenatal
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cpt-prenatal.steps.ts";

export const ENTRY = { course: "ACSMCPT", slug: "acsm-twenty-four-weeks-leaking-fluid" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
