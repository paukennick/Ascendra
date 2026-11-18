// REQ-338: golden paths for the personal trainer (ACSMCPT) band of NASMCPT/cpt-six-weeks-off-make-it-up band (ACSMCPT/acsm-six-weeks-off-make-it-up.band.json):
// the same case and paths as its base, registered to this course's objective.
//
//   npm run sim:golden -- steps acsm-lapse
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cpt-lapse.steps.ts";

export const ENTRY = { course: "ACSMCPT", slug: "acsm-six-weeks-off-make-it-up" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
