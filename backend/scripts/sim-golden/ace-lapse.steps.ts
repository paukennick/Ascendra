// REQ-338: golden paths for the personal trainer (ACECPT) band of NASMCPT/cpt-six-weeks-off-make-it-up band (ACECPT/ace-six-weeks-off-make-it-up.band.json):
// the same case and paths as its base, registered to this course's objective.
//
//   npm run sim:golden -- steps ace-lapse
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cpt-lapse.steps.ts";

export const ENTRY = { course: "ACECPT", slug: "ace-six-weeks-off-make-it-up" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
