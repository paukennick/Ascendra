// REQ-333: golden paths for the PYAUTO band of PYTHON/py-import-crash-traceback
// (PYAUTO/py-import-crash-traceback-pyauto.band.json): the same case and paths, registered to the
// PYAUTO objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./py-trace.steps.ts";

export const ENTRY = { course: "PYAUTO", slug: "py-import-crash-traceback-pyauto" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
