// REQ-316: golden paths for the Linux+ (XK0-006) band of LFCS/fstab-uuid-typo-emergency
// (LINUXPLUS/fstab-uuid-typo-emergency-linuxplus.band.json): the same case and paths, registered to the
// LINUXPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./lfcs-fstab.steps.ts";

export const ENTRY = { course: "LINUXPLUS", slug: "fstab-uuid-typo-emergency-linuxplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
