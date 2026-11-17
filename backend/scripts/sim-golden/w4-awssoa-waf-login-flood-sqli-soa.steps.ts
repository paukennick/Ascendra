// REQ-316: golden paths for the AWS CloudOps Engineer Associate (SOA-C03) band of AWSSAA/waf-login-flood-sqli
// (AWSSOA/waf-login-flood-sqli-soa.band.json): the same case and paths, registered to the
// AWSSOA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./saa-waf.steps.ts";

export const ENTRY = { course: "AWSSOA", slug: "waf-login-flood-sqli-soa" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
