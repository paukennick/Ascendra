// REQ-320: golden paths for the AWSDOP band of AWSSOA/alb-health-check-login-redirect
// (AWSDOP/alb-health-check-login-redirect-dop.band.json): the same case and paths, registered to the
// AWSDOP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./soa-elbhc.steps.ts";

export const ENTRY = { course: "AWSDOP", slug: "alb-health-check-login-redirect-dop" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
