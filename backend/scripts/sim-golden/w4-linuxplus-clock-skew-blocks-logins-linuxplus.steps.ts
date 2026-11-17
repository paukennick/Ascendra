// REQ-316: golden paths for the Linux+ (XK0-006) band of LFCS/clock-skew-blocks-logins
// (LINUXPLUS/clock-skew-blocks-logins-linuxplus.band.json): the same case and paths, registered to the
// LINUXPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./lfcs-chrony.steps.ts";

export const ENTRY = { course: "LINUXPLUS", slug: "clock-skew-blocks-logins-linuxplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
