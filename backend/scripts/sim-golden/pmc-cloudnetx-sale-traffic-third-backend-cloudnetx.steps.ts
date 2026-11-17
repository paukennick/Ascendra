// REQ-321: golden paths for the CloudNetX (CNX-001) band of LFCS/sale-traffic-third-backend
// (CLOUDNETX/sale-traffic-third-backend-cloudnetx.band.json): the same case and paths, registered to the
// CLOUDNETX objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./lfcs-lb.steps.ts";

export const ENTRY = { course: "CLOUDNETX", slug: "sale-traffic-third-backend-cloudnetx" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
