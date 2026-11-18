// REQ-336: golden paths for the KCSA band of CKS/restricted-profile-payments-rollout
// (KCSA/restricted-profile-payments-rollout-kcsa.band.json): the same case and paths, registered to the
// KCSA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./isp-cks-hardening.steps.ts";

export const ENTRY = { course: "KCSA", slug: "restricted-profile-payments-rollout-kcsa" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
