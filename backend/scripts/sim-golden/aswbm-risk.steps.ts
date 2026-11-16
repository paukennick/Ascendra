// REQ-289: golden paths for the ASWB Masters band of the Clinical suicide and violence risk session
// (ASWBMASTERS/aswbm-suicide-violence-risk.band.json): the same session and paths, registered to this course's objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./aswbc-risk.steps.ts";

export const ENTRY = { course: "ASWBMASTERS", slug: "aswbm-suicide-violence-risk" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
