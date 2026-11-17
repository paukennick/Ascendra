// REQ-320: golden paths for the CGOA band of KCNA/service-selector-no-endpoints
// (CGOA/service-selector-no-endpoints-cgoa.band.json): the same case and paths, registered to the
// CGOA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./kcna-selector.steps.ts";

export const ENTRY = { course: "CGOA", slug: "service-selector-no-endpoints-cgoa" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
