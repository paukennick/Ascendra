// REQ-320: golden paths for the CNPA band of KCA/policy-enforced-without-reading-reports
// (CNPA/policy-enforced-without-reading-reports-cnpa.band.json): the same case and paths, registered to the
// CNPA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./kca-enforce.steps.ts";

export const ENTRY = { course: "CNPA", slug: "policy-enforced-without-reading-reports-cnpa" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
