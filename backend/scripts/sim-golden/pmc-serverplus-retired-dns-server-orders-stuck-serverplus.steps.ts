// REQ-321: golden paths for the Server+ (SK0-005) band of LINUXPLUS/retired-dns-server-orders-stuck
// (SERVERPLUS/retired-dns-server-orders-stuck-serverplus.band.json): the same case and paths, registered to the
// SERVERPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./linuxplus-dns.steps.ts";

export const ENTRY = { course: "SERVERPLUS", slug: "retired-dns-server-orders-stuck-serverplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
