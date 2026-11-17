// REQ-320: golden paths for the GCPDEVOPS band of GCPCDL/bigquery-dashboard-bill
// (GCPDEVOPS/bigquery-dashboard-bill-devops.band.json): the same case and paths, registered to the
// GCPDEVOPS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpcdl-bill.steps.ts";

export const ENTRY = { course: "GCPDEVOPS", slug: "bigquery-dashboard-bill-devops" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
