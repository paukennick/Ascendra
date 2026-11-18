// REQ-337 (docs/sims.md 22.41): golden paths for the ASWBMASTERS band of ASWBCLINICAL/aswbc-refusing-admission-for-his-dog
// (ASWBMASTERS/aswbm-refusing-admission-for-his-dog.band.json): the same case and paths, registered to this course's objective.
//   npm run sim:golden -- steps aswbm-band-selfdet
import type { StepsSpec } from "./steps.ts";
import { paths } from "./aswbc-selfdet.steps.ts";

export const ENTRY = { course: "ASWBMASTERS", slug: "aswbm-refusing-admission-for-his-dog" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
