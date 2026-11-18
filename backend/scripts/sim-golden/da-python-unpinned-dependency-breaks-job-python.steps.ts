// REQ-333: golden paths for the PYTHON band of PYAUTO/pyauto-unpinned-dependency-breaks-job
// (PYTHON/unpinned-dependency-breaks-job-python.band.json): the same case and paths, registered to the
// PYTHON objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pyauto-pin.steps.ts";

export const ENTRY = { course: "PYTHON", slug: "unpinned-dependency-breaks-job-python" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
