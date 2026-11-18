// REQ-335: golden paths for the GCPDEVOPS band of GCPSEC/service-account-key-on-public-repo
// (GCPDEVOPS/service-account-key-on-public-repo-devops.band.json): the same case and paths, registered to the
// GCPDEVOPS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpsec-sakey.steps.ts";

export const ENTRY = { course: "GCPDEVOPS", slug: "service-account-key-on-public-repo-devops" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
