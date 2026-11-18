// REQ-338: golden paths for the personal trainer (ACECPT) band of NASMCPT/cpt-watch-zone-on-a-beta-blocker band (ACECPT/ace-watch-zone-on-a-beta-blocker.band.json):
// the same case and paths as its base, registered to this course's objective.
//
//   npm run sim:golden -- steps ace-beta
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cpt-beta.steps.ts";

export const ENTRY = { course: "ACECPT", slug: "ace-watch-zone-on-a-beta-blocker" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
