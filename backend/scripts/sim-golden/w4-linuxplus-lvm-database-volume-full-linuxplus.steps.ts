// REQ-316: golden paths for the Linux+ (XK0-006) band of LFCS/lvm-database-volume-full
// (LINUXPLUS/lvm-database-volume-full-linuxplus.band.json): the same case and paths, registered to the
// LINUXPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./lfcs-lvm.steps.ts";

export const ENTRY = { course: "LINUXPLUS", slug: "lvm-database-volume-full-linuxplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
