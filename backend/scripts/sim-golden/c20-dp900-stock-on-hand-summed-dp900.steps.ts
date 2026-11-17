// REQ-320: golden paths for the DP900 band of PL300/pl300-stock-on-hand-summed
// (DP900/stock-on-hand-summed-dp900.band.json): the same case and paths, registered to the
// DP900 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pl300-semi.steps.ts";

export const ENTRY = { course: "DP900", slug: "stock-on-hand-summed-dp900" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
