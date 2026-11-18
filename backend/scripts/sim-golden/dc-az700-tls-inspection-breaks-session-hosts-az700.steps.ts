// REQ-335: golden paths for the AZ700 band of AZ140/tls-inspection-breaks-session-hosts
// (AZ700/tls-inspection-breaks-session-hosts-az700.band.json): the same case and paths, registered to the
// AZ700 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./az140-tls.steps.ts";

export const ENTRY = { course: "AZ700", slug: "tls-inspection-breaks-session-hosts-az700" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
