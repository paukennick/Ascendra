// REQ-338: golden paths for the personal trainer (NSCACPT) band of NASMCPT/cpt-watch-zone-on-a-beta-blocker band (NSCACPT/nscacpt-watch-zone-on-a-beta-blocker.band.json):
// the same case and paths as its base, registered to this course's objective.
//
//   npm run sim:golden -- steps nscacpt-beta
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cpt-beta.steps.ts";

export const ENTRY = { course: "NSCACPT", slug: "nscacpt-watch-zone-on-a-beta-blocker" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
