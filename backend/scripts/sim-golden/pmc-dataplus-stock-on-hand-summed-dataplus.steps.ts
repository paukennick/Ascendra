// REQ-321: golden paths for the Data+ (DA0-002) band of PL300/pl300-stock-on-hand-summed
// (DATAPLUS/stock-on-hand-summed-dataplus.band.json): the same case and paths, registered to the
// DATAPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pl300-semi.steps.ts";

export const ENTRY = { course: "DATAPLUS", slug: "stock-on-hand-summed-dataplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
