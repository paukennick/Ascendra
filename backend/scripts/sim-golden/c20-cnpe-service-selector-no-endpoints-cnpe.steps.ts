// REQ-320: golden paths for the CNPE band of KCNA/service-selector-no-endpoints
// (CNPE/service-selector-no-endpoints-cnpe.band.json): the same case and paths, registered to the
// CNPE objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./kcna-selector.steps.ts";

export const ENTRY = { course: "CNPE", slug: "service-selector-no-endpoints-cnpe" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
