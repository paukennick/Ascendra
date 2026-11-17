// REQ-321: golden paths for the Computer Science Foundations band of SECPLUS/phish-to-account-takeover
// (CMPCBS/phish-to-account-takeover-cmpcbs.band.json): the same case and paths, registered to the
// CMPCBS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./secplus-phish.steps.ts";

export const ENTRY = { course: "CMPCBS", slug: "phish-to-account-takeover-cmpcbs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
