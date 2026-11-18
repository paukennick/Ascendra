// REQ-335: golden paths for the GCPPDE band of GCPDBE/reporting-query-stalls-read-replica
// (GCPPDE/reporting-query-stalls-read-replica-pde.band.json): the same case and paths, registered to the
// GCPPDE objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpdbe-replica.steps.ts";

export const ENTRY = { course: "GCPPDE", slug: "reporting-query-stalls-read-replica-pde" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
