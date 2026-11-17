// REQ-320: golden paths for the GCPPCA band of GCPCDL/bigquery-dashboard-bill
// (GCPPCA/bigquery-dashboard-bill-pca.band.json): the same case and paths, registered to the
// GCPPCA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpcdl-bill.steps.ts";

export const ENTRY = { course: "GCPPCA", slug: "bigquery-dashboard-bill-pca" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
