// REQ-321: golden paths for the Project+ (PK0-005) band of PSMI/sprint-status-meeting-daily-scrum
// (PROJECTPLUS/sprint-status-meeting-daily-scrum-projectplus.band.json): the same case and paths, registered to the
// PROJECTPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./psm-daily.steps.ts";

export const ENTRY = { course: "PROJECTPLUS", slug: "sprint-status-meeting-daily-scrum-projectplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
