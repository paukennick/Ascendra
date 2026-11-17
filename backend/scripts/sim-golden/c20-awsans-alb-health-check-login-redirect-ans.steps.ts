// REQ-320: golden paths for the AWSANS band of AWSSOA/alb-health-check-login-redirect
// (AWSANS/alb-health-check-login-redirect-ans.band.json): the same case and paths, registered to the
// AWSANS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./soa-elbhc.steps.ts";

export const ENTRY = { course: "AWSANS", slug: "alb-health-check-login-redirect-ans" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
