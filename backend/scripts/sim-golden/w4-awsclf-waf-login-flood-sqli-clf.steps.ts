// REQ-316: golden paths for the AWS Cloud Practitioner (CLF-C02) band of AWSSAA/waf-login-flood-sqli
// (AWSCLF/waf-login-flood-sqli-clf.band.json): the same case and paths, registered to the
// AWSCLF objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./saa-waf.steps.ts";

export const ENTRY = { course: "AWSCLF", slug: "waf-login-flood-sqli-clf" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
