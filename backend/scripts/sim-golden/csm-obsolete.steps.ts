// REQ-311: golden paths for the CSM band of the PSM I obsolete-Goal Sprint
// (CSM/csm-sprint-goal-becomes-obsolete.band.json): the same Sprint and paths.
import type { StepsSpec } from "./steps.ts";
import { spec as base } from "./psm-obsolete.steps.ts";

export const ENTRY = { course: "CSM", slug: "csm-sprint-goal-becomes-obsolete" };

export function spec(): StepsSpec {
  return { ...base(), slug: ENTRY.slug };
}
