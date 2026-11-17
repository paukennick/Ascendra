// REQ-320: golden paths for the CKAD band of KCNA/service-selector-no-endpoints
// (CKAD/service-selector-no-endpoints-ckad.band.json): the same case and paths, registered to the
// CKAD objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./kcna-selector.steps.ts";

export const ENTRY = { course: "CKAD", slug: "service-selector-no-endpoints-ckad" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
