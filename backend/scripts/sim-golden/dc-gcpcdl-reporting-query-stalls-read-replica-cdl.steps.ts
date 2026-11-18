// REQ-335: golden paths for the GCPCDL band of GCPDBE/reporting-query-stalls-read-replica
// (GCPCDL/reporting-query-stalls-read-replica-cdl.band.json): the same case and paths, registered to the
// GCPCDL objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpdbe-replica.steps.ts";

export const ENTRY = { course: "GCPCDL", slug: "reporting-query-stalls-read-replica-cdl" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
