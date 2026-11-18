// REQ-337 (docs/sims.md 22.41): golden paths for the ASWBMASTERS band of ASWBCLINICAL/aswbc-walk-in-after-the-fire
// (ASWBMASTERS/aswbm-walk-in-after-the-fire.band.json): the same case and paths, registered to this course's objective.
//   npm run sim:golden -- steps aswbm-band-crisis
import type { StepsSpec } from "./steps.ts";
import { paths } from "./aswbc-crisis.steps.ts";

export const ENTRY = { course: "ASWBMASTERS", slug: "aswbm-walk-in-after-the-fire" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
