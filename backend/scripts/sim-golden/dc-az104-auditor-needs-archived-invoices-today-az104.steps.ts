// REQ-335: golden paths for the AZ104 band of DP900/auditor-needs-archived-invoices-today
// (AZ104/auditor-needs-archived-invoices-today-az104.band.json): the same case and paths, registered to the
// AZ104 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dp900-archive.steps.ts";

export const ENTRY = { course: "AZ104", slug: "auditor-needs-archived-invoices-today-az104" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
