// REQ-335: golden paths for the AZ900 band of DP900/auditor-needs-archived-invoices-today
// (AZ900/auditor-needs-archived-invoices-today-az900.band.json): the same case and paths, registered to the
// AZ900 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dp900-archive.steps.ts";

export const ENTRY = { course: "AZ900", slug: "auditor-needs-archived-invoices-today-az900" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
