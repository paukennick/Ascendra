// REQ-321: golden paths for the Server+ (SK0-005) band of LFCS/sale-traffic-third-backend
// (SERVERPLUS/sale-traffic-third-backend-serverplus.band.json): the same case and paths, registered to the
// SERVERPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./lfcs-lb.steps.ts";

export const ENTRY = { course: "SERVERPLUS", slug: "sale-traffic-third-backend-serverplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
