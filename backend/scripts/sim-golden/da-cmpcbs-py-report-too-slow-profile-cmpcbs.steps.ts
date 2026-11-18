// REQ-333: golden paths for the CMPCBS band of PYTHON/py-report-too-slow-profile
// (CMPCBS/py-report-too-slow-profile-cmpcbs.band.json): the same case and paths, registered to the
// CMPCBS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./py-profile.steps.ts";

export const ENTRY = { course: "CMPCBS", slug: "py-report-too-slow-profile-cmpcbs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
