// REQ-321: golden paths for the PMP (July 2026 outline) band of PSMI/sprint-goal-becomes-obsolete
// (PMP/sprint-goal-becomes-obsolete-pmp.band.json): the same case and paths, registered to the
// PMP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./psm-obsolete.steps.ts";

export const ENTRY = { course: "PMP", slug: "sprint-goal-becomes-obsolete-pmp" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
