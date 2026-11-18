// REQ-335: golden paths for the GCPACE band of GCPSEC/service-account-key-on-public-repo
// (GCPACE/service-account-key-on-public-repo-ace.band.json): the same case and paths, registered to the
// GCPACE objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpsec-sakey.steps.ts";

export const ENTRY = { course: "GCPACE", slug: "service-account-key-on-public-repo-ace" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
