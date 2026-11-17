// REQ-321: golden paths for the PMI-ACP (March 2026 outline) band of PSMI/sprint-release-before-review
// (PMIACP/sprint-release-before-review-pmiacp.band.json): the same case and paths, registered to the
// PMIACP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./psm-release.steps.ts";

export const ENTRY = { course: "PMIACP", slug: "sprint-release-before-review-pmiacp" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
