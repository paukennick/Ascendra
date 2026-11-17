// REQ-320: golden paths for the CNPE band of KCA/policy-enforced-without-reading-reports
// (CNPE/policy-enforced-without-reading-reports-cnpe.band.json): the same case and paths, registered to the
// CNPE objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./kca-enforce.steps.ts";

export const ENTRY = { course: "CNPE", slug: "policy-enforced-without-reading-reports-cnpe" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
