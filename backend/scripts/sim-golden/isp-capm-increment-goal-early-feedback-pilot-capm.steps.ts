// REQ-336: golden paths for the CAPM band of PMIACP/increment-goal-early-feedback-pilot
// (CAPM/increment-goal-early-feedback-pilot-capm.band.json): the same case and paths, registered to the
// CAPM objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./isp-acp-increments.steps.ts";

export const ENTRY = { course: "CAPM", slug: "increment-goal-early-feedback-pilot-capm" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
