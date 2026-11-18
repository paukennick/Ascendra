// REQ-337 (docs/sims.md 22.41): golden paths for the ASWBCLINICAL band of ASWBMASTERS/aswbm-fifteen-asks-without-her-parents
// (ASWBCLINICAL/aswbc-fifteen-asks-without-her-parents.band.json): the same case and paths, registered to this course's objective.
//   npm run sim:golden -- steps aswbc-band-minor
import type { StepsSpec } from "./steps.ts";
import { paths } from "./aswbm-minor.steps.ts";

export const ENTRY = { course: "ASWBCLINICAL", slug: "aswbc-fifteen-asks-without-her-parents" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
