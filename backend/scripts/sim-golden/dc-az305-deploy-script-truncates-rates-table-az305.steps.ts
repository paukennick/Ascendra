// REQ-335: golden paths for the AZ305 band of DP300/deploy-script-truncates-rates-table
// (AZ305/deploy-script-truncates-rates-table-az305.band.json): the same case and paths, registered to the
// AZ305 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dp300-pitr.steps.ts";

export const ENTRY = { course: "AZ305", slug: "deploy-script-truncates-rates-table-az305" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
