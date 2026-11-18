// REQ-335: golden paths for the GCPDEVOPS band of GCPSEC/unsigned-hotfix-blocked-by-binauthz
// (GCPDEVOPS/unsigned-hotfix-blocked-by-binauthz-devops.band.json): the same case and paths, registered to the
// GCPDEVOPS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpsec-binauthz.steps.ts";

export const ENTRY = { course: "GCPDEVOPS", slug: "unsigned-hotfix-blocked-by-binauthz-devops" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
