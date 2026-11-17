// REQ-321: golden paths for the Server+ (SK0-005) band of LFCS/service-no-restart-after-update
// (SERVERPLUS/service-no-restart-after-update-serverplus.band.json): the same case and paths, registered to the
// SERVERPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./lfcs-unit.steps.ts";

export const ENTRY = { course: "SERVERPLUS", slug: "service-no-restart-after-update-serverplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
