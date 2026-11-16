// REQ-289: golden paths for the ASWB Masters band of the Clinical termination session
// (ASWBMASTERS/aswbm-termination-nonpayment.band.json): the same session and paths, registered to this course's objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./aswbc-termination.steps.ts";

export const ENTRY = { course: "ASWBMASTERS", slug: "aswbm-termination-nonpayment" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
