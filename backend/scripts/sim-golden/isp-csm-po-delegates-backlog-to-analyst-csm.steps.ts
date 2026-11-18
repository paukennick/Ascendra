// REQ-336: golden paths for the CSM band of PSMI/po-delegates-backlog-to-analyst
// (CSM/po-delegates-backlog-to-analyst-csm.band.json): the same case and paths, registered to the
// CSM objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./isp-psmi-accountability.steps.ts";

export const ENTRY = { course: "CSM", slug: "po-delegates-backlog-to-analyst-csm" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
