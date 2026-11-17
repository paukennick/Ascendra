// REQ-321: golden paths for the PMI-CP band of PMP/pmp-contact-center-move-procurement
// (PMICP/contact-center-move-contracts-pmicp.band.json): the same case and paths, registered to the
// PMICP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pmp-move.steps.ts";

export const ENTRY = { course: "PMICP", slug: "contact-center-move-contracts-pmicp" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
