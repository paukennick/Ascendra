// REQ-333: golden paths for the PCEP band of PYTHON/py-report-too-slow-profile
// (PCEP/py-report-too-slow-profile-pcep.band.json): the same case and paths, registered to the
// PCEP objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./py-profile.steps.ts";

export const ENTRY = { course: "PCEP", slug: "py-report-too-slow-profile-pcep" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
