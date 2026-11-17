// REQ-321: golden paths for the Data+ (DA0-002) band of PL300/pl300-rls-region-manager
// (DATAPLUS/rls-region-manager-dataplus.band.json): the same case and paths, registered to the
// DATAPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pl300-rls.steps.ts";

export const ENTRY = { course: "DATAPLUS", slug: "rls-region-manager-dataplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
