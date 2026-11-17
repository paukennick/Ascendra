// REQ-311: golden paths for the CSM band of the PSM I Daily Scrum Sprint
// (CSM/csm-sprint-status-meeting-daily-scrum.band.json): the same Sprint and
// the same paths, registered to the CSM objective.
import type { StepsSpec } from "./steps.ts";
import { spec as base } from "./psm-daily.steps.ts";

export const ENTRY = { course: "CSM", slug: "csm-sprint-status-meeting-daily-scrum" };

export function spec(): StepsSpec {
  return { ...base(), slug: ENTRY.slug };
}
