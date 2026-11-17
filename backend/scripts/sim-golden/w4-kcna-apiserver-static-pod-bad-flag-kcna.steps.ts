// REQ-316: golden paths for the KCNA band of CKA/apiserver-static-pod-bad-flag
// (KCNA/apiserver-static-pod-bad-flag-kcna.band.json): the same case and paths, registered to the
// KCNA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./cka-apiserver.steps.ts";

export const ENTRY = { course: "KCNA", slug: "apiserver-static-pod-bad-flag-kcna" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
