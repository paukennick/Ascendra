// REQ-333: golden paths for the MSCS band of LFCS/report-workers-starve-api
// (MSCS/report-workers-starve-api-mscs.band.json): the same case and paths, registered to the
// MSCS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./lfcs-proc.steps.ts";

export const ENTRY = { course: "MSCS", slug: "report-workers-starve-api-mscs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
