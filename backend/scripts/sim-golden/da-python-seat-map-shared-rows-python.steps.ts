// REQ-333: golden paths for the PYTHON band of PCEP/pcep-seat-map-shared-rows
// (PYTHON/seat-map-shared-rows-python.band.json): the same case and paths, registered to the
// PYTHON objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pcep-rows.steps.ts";

export const ENTRY = { course: "PYTHON", slug: "seat-map-shared-rows-python" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
