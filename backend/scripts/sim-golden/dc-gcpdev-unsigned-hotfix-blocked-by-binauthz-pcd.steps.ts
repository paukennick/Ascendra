// REQ-335: golden paths for the GCPDEV band of GCPSEC/unsigned-hotfix-blocked-by-binauthz
// (GCPDEV/unsigned-hotfix-blocked-by-binauthz-pcd.band.json): the same case and paths, registered to the
// GCPDEV objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpsec-binauthz.steps.ts";

export const ENTRY = { course: "GCPDEV", slug: "unsigned-hotfix-blocked-by-binauthz-pcd" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
