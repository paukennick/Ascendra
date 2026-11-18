// REQ-335: golden paths for the SC500 band of AZ140/tls-inspection-breaks-session-hosts
// (SC500/tls-inspection-breaks-session-hosts-sc500.band.json): the same case and paths, registered to the
// SC500 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./az140-tls.steps.ts";

export const ENTRY = { course: "SC500", slug: "tls-inspection-breaks-session-hosts-sc500" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
