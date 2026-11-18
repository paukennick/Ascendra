// REQ-333: golden paths for the PYDATA band of PL300/pl300-stock-on-hand-summed
// (PYDATA/stock-on-hand-resample-pydata.band.json): the same case and paths, registered to the
// PYDATA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pl300-semi.steps.ts";

export const ENTRY = { course: "PYDATA", slug: "stock-on-hand-resample-pydata" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
