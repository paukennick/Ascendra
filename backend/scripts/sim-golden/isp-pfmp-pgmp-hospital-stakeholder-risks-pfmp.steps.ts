// REQ-336: golden paths for the PFMP band of PGMP/pgmp-hospital-stakeholder-risks
// (PFMP/pgmp-hospital-stakeholder-risks-pfmp.band.json): the same case and paths, registered to the
// PFMP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./isp-pgmp-stakeholders.steps.ts";

export const ENTRY = { course: "PFMP", slug: "pgmp-hospital-stakeholder-risks-pfmp" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
