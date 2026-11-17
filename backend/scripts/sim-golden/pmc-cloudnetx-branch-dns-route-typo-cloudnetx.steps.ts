// REQ-321: golden paths for the CloudNetX (CNX-001) band of NETWORKPLUS/branch-dns-route-typo
// (CLOUDNETX/branch-dns-route-typo-cloudnetx.band.json): the same case and paths, registered to the
// CLOUDNETX objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./net-dns.steps.ts";

export const ENTRY = { course: "CLOUDNETX", slug: "branch-dns-route-typo-cloudnetx" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
