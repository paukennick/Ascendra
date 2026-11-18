// REQ-333: golden paths for the CMPCBS band of CISM/cism-security-business-case-budget
// (CMPCBS/security-business-case-cmpcbs.band.json): the same case and paths, registered to the
// CMPCBS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./cism-budget.steps.ts";

export const ENTRY = { course: "CMPCBS", slug: "security-business-case-cmpcbs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
