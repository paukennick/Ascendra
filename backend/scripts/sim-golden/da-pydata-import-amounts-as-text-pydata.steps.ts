// REQ-333: golden paths for the PYDATA band of PYTHON/py-import-crash-traceback
// (PYDATA/import-amounts-as-text-pydata.band.json): the same case and paths, registered to the
// PYDATA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./py-trace.steps.ts";

export const ENTRY = { course: "PYDATA", slug: "import-amounts-as-text-pydata" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
