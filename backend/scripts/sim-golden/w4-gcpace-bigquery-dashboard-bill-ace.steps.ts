// REQ-316: golden paths for the Google Cloud Associate Cloud Engineer band of GCPCDL/bigquery-dashboard-bill
// (GCPACE/bigquery-dashboard-bill-ace.band.json): the same case and paths, registered to the
// GCPACE objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpcdl-bill.steps.ts";

export const ENTRY = { course: "GCPACE", slug: "bigquery-dashboard-bill-ace" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
