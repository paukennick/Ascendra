// REQ-321: golden paths for the PMI-ACP (March 2026 outline) band of PSMI/sprint-goal-becomes-obsolete
// (PMIACP/sprint-goal-becomes-obsolete-pmiacp.band.json): the same case and paths, registered to the
// PMIACP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./psm-obsolete.steps.ts";

export const ENTRY = { course: "PMIACP", slug: "sprint-goal-becomes-obsolete-pmiacp" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
