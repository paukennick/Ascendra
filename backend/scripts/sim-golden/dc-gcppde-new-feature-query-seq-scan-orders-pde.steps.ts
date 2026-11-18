// REQ-335: golden paths for the GCPPDE band of GCPDBE/new-feature-query-seq-scan-orders
// (GCPPDE/new-feature-query-seq-scan-orders-pde.band.json): the same case and paths, registered to the
// GCPPDE objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpdbe-index.steps.ts";

export const ENTRY = { course: "GCPPDE", slug: "new-feature-query-seq-scan-orders-pde" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
