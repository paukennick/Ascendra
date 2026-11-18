// REQ-336: golden paths for the CKS band of CCA/cilium-default-deny-breaks-dns
// (CKS/cilium-default-deny-breaks-dns-cks.band.json): the same case and paths, registered to the
// CKS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./isp-cca-policy.steps.ts";

export const ENTRY = { course: "CKS", slug: "cilium-default-deny-breaks-dns-cks" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
