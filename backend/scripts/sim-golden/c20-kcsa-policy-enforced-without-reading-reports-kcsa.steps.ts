// REQ-320: golden paths for the KCSA band of KCA/policy-enforced-without-reading-reports
// (KCSA/policy-enforced-without-reading-reports-kcsa.band.json): the same case and paths, registered to the
// KCSA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./kca-enforce.steps.ts";

export const ENTRY = { course: "KCSA", slug: "policy-enforced-without-reading-reports-kcsa" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
