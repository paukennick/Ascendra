// REQ-321: golden paths for the Tech+ (FC0-U71) band of NETWORKPLUS/branch-dns-route-typo
// (TECHPLUS/branch-dns-route-typo-techplus.band.json): the same case and paths, registered to the
// TECHPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./net-dns.steps.ts";

export const ENTRY = { course: "TECHPLUS", slug: "branch-dns-route-typo-techplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
