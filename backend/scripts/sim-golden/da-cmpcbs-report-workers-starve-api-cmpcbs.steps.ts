// REQ-333: golden paths for the CMPCBS band of LFCS/report-workers-starve-api
// (CMPCBS/report-workers-starve-api-cmpcbs.band.json): the same case and paths, registered to the
// CMPCBS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./lfcs-proc.steps.ts";

export const ENTRY = { course: "CMPCBS", slug: "report-workers-starve-api-cmpcbs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
