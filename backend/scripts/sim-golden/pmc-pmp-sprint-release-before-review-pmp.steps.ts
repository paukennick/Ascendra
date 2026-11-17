// REQ-321: golden paths for the PMP (July 2026 outline) band of PSMI/sprint-release-before-review
// (PMP/sprint-release-before-review-pmp.band.json): the same case and paths, registered to the
// PMP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./psm-release.steps.ts";

export const ENTRY = { course: "PMP", slug: "sprint-release-before-review-pmp" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
