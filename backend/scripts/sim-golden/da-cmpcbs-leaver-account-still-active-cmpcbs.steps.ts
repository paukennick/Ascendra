// REQ-333: golden paths for the CMPCBS band of ISC2CC/cc-leaver-account-still-active
// (CMPCBS/leaver-account-still-active-cmpcbs.band.json): the same case and paths, registered to the
// CMPCBS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./cc-leaver.steps.ts";

export const ENTRY = { course: "CMPCBS", slug: "leaver-account-still-active-cmpcbs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
