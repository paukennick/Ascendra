// REQ-320: golden paths for the AWSANS band of AWSSAA/waf-login-flood-sqli
// (AWSANS/waf-login-flood-sqli-ans.band.json): the same case and paths, registered to the
// AWSANS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./saa-waf.steps.ts";

export const ENTRY = { course: "AWSANS", slug: "waf-login-flood-sqli-ans" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
