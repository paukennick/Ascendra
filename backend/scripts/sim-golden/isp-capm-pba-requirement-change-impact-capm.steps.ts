// REQ-336: golden paths for the CAPM band of PMIPBA/pba-requirement-change-impact
// (CAPM/pba-requirement-change-impact-capm.band.json): the same case and paths, registered to the
// CAPM objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./isp-pba-trace.steps.ts";

export const ENTRY = { course: "CAPM", slug: "pba-requirement-change-impact-capm" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
