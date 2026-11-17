// REQ-320: golden paths for the AWSSCS band of AWSSAA/waf-login-flood-sqli
// (AWSSCS/waf-login-flood-sqli-scs.band.json): the same case and paths, registered to the
// AWSSCS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./saa-waf.steps.ts";

export const ENTRY = { course: "AWSSCS", slug: "waf-login-flood-sqli-scs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
