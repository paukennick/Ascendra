// REQ-320: golden paths for the GCPPDE band of GCPCDL/bigquery-dashboard-bill
// (GCPPDE/bigquery-dashboard-bill-pde.band.json): the same case and paths, registered to the
// GCPPDE objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpcdl-bill.steps.ts";

export const ENTRY = { course: "GCPPDE", slug: "bigquery-dashboard-bill-pde" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
