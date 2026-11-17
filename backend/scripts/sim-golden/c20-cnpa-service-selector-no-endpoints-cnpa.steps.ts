// REQ-320: golden paths for the CNPA band of KCNA/service-selector-no-endpoints
// (CNPA/service-selector-no-endpoints-cnpa.band.json): the same case and paths, registered to the
// CNPA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./kcna-selector.steps.ts";

export const ENTRY = { course: "CNPA", slug: "service-selector-no-endpoints-cnpa" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
