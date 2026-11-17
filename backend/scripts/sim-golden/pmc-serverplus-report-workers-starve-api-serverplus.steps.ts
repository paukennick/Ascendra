// REQ-321: golden paths for the Server+ (SK0-005) band of LFCS/report-workers-starve-api
// (SERVERPLUS/report-workers-starve-api-serverplus.band.json): the same case and paths, registered to the
// SERVERPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./lfcs-proc.steps.ts";

export const ENTRY = { course: "SERVERPLUS", slug: "report-workers-starve-api-serverplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
