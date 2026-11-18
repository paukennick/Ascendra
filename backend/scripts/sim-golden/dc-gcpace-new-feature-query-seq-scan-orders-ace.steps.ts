// REQ-335: golden paths for the GCPACE band of GCPDBE/new-feature-query-seq-scan-orders
// (GCPACE/new-feature-query-seq-scan-orders-ace.band.json): the same case and paths, registered to the
// GCPACE objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpdbe-index.steps.ts";

export const ENTRY = { course: "GCPACE", slug: "new-feature-query-seq-scan-orders-ace" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
