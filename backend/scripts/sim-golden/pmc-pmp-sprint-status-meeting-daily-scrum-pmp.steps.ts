// REQ-321: golden paths for the PMP (July 2026 outline) band of PSMI/sprint-status-meeting-daily-scrum
// (PMP/sprint-status-meeting-daily-scrum-pmp.band.json): the same case and paths, registered to the
// PMP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./psm-daily.steps.ts";

export const ENTRY = { course: "PMP", slug: "sprint-status-meeting-daily-scrum-pmp" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
