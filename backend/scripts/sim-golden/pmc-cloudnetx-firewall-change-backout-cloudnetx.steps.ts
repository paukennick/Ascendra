// REQ-321: golden paths for the CloudNetX (CNX-001) band of SECPLUS/firewall-change-backout
// (CLOUDNETX/firewall-change-backout-cloudnetx.band.json): the same case and paths, registered to the
// CLOUDNETX objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./secplus-change.steps.ts";

export const ENTRY = { course: "CLOUDNETX", slug: "firewall-change-backout-cloudnetx" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
