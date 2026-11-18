// REQ-338: golden paths for the personal trainer (NCCPTCPT) band of NASMCPT/cpt-six-weeks-off-make-it-up band (NCCPTCPT/nccpt-six-weeks-off-make-it-up.band.json):
// the same case and paths as its base, registered to this course's objective.
//
//   npm run sim:golden -- steps nccpt-lapse
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cpt-lapse.steps.ts";

export const ENTRY = { course: "NCCPTCPT", slug: "nccpt-six-weeks-off-make-it-up" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
