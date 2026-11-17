// REQ-321: golden paths for the CAPM (2023 outline) band of PSMI/sprint-status-meeting-daily-scrum
// (CAPM/sprint-status-meeting-daily-scrum-capm.band.json): the same case and paths, registered to the
// CAPM objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./psm-daily.steps.ts";

export const ENTRY = { course: "CAPM", slug: "sprint-status-meeting-daily-scrum-capm" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
