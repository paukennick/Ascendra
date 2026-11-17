// REQ-316: golden paths for the KCNA band of CKA/crashloop-bad-configmap
// (KCNA/crashloop-bad-configmap-kcna.band.json): the same case and paths, registered to the
// KCNA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./cka-crashloop.steps.ts";

export const ENTRY = { course: "KCNA", slug: "crashloop-bad-configmap-kcna" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
