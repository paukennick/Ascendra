// REQ-333: golden paths for the MSCS band of PYTHON/py-report-too-slow-profile
// (MSCS/py-report-too-slow-profile-mscs.band.json): the same case and paths, registered to the
// MSCS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./py-profile.steps.ts";

export const ENTRY = { course: "MSCS", slug: "py-report-too-slow-profile-mscs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
