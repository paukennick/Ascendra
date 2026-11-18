// REQ-337 (docs/sims.md 22.41): golden paths for the ASWBMASTERS band of ASWBCLINICAL/aswbc-subpoena-in-a-custody-fight
// (ASWBMASTERS/aswbm-subpoena-in-a-custody-fight.band.json): the same case and paths, registered to this course's objective.
//   npm run sim:golden -- steps aswbm-band-subpoena
import type { StepsSpec } from "./steps.ts";
import { paths } from "./aswbc-subpoena.steps.ts";

export const ENTRY = { course: "ASWBMASTERS", slug: "aswbm-subpoena-in-a-custody-fight" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
