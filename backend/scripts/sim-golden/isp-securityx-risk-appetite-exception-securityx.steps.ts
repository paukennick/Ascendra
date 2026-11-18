// REQ-336: golden paths for the SECURITYX band of CISM/cism-risk-appetite-exception
// (SECURITYX/risk-appetite-exception-securityx.band.json): the same case and paths, registered to the
// SECURITYX objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./cism-exception.steps.ts";

export const ENTRY = { course: "SECURITYX", slug: "risk-appetite-exception-securityx" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
