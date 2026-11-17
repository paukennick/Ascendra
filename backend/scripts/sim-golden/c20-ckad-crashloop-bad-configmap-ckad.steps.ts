// REQ-320: golden paths for the CKAD band of CKA/crashloop-bad-configmap
// (CKAD/crashloop-bad-configmap-ckad.band.json): the same case and paths, registered to the
// CKAD objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./cka-crashloop.steps.ts";

export const ENTRY = { course: "CKAD", slug: "crashloop-bad-configmap-ckad" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
