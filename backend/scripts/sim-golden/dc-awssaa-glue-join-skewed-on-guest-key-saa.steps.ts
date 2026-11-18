// REQ-335: golden paths for the AWSSAA band of AWSDEA/glue-join-skewed-on-guest-key
// (AWSSAA/glue-join-skewed-on-guest-key-saa.band.json): the same case and paths, registered to the
// AWSSAA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dea-glue-skew.steps.ts";

export const ENTRY = { course: "AWSSAA", slug: "glue-join-skewed-on-guest-key-saa" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
