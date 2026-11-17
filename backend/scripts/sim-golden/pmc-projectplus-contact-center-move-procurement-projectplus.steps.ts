// REQ-321: golden paths for the Project+ (PK0-005) band of PMP/pmp-contact-center-move-procurement
// (PROJECTPLUS/contact-center-move-procurement-projectplus.band.json): the same case and paths, registered to the
// PROJECTPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pmp-move.steps.ts";

export const ENTRY = { course: "PROJECTPLUS", slug: "contact-center-move-procurement-projectplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
