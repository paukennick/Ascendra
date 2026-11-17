// REQ-321: golden paths for the AutoOps+ (AT0-001) band of LINUXFUND/web-service-fails-after-edit
// (AUTOOPSPLUS/web-service-fails-after-edit-autoopsplus.band.json): the same case and paths, registered to the
// AUTOOPSPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./linuxfund-nginx.steps.ts";

export const ENTRY = { course: "AUTOOPSPLUS", slug: "web-service-fails-after-edit-autoopsplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
