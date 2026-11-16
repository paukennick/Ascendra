// REQ-289: golden paths for the ASWB Clinical band of the Masters boundaries session
// (ASWBCLINICAL/aswbc-boundaries-small-town.band.json): the same session and paths, registered to this course's objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./aswbm-boundaries.steps.ts";

export const ENTRY = { course: "ASWBCLINICAL", slug: "aswbc-boundaries-small-town" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
