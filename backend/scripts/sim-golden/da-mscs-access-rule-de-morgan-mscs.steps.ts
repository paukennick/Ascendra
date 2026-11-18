// REQ-333: golden paths for the MSCS band of CMPCBS/cmpcbs-access-rule-de-morgan
// (MSCS/access-rule-de-morgan-mscs.band.json): the same case and paths, registered to the
// MSCS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./cmp-logic.steps.ts";

export const ENTRY = { course: "MSCS", slug: "access-rule-de-morgan-mscs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
