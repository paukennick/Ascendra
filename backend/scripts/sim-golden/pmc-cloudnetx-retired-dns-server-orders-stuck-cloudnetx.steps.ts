// REQ-321: golden paths for the CloudNetX (CNX-001) band of LINUXPLUS/retired-dns-server-orders-stuck
// (CLOUDNETX/retired-dns-server-orders-stuck-cloudnetx.band.json): the same case and paths, registered to the
// CLOUDNETX objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./linuxplus-dns.steps.ts";

export const ENTRY = { course: "CLOUDNETX", slug: "retired-dns-server-orders-stuck-cloudnetx" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
