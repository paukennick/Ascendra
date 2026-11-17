// REQ-316: golden paths for the Linux+ (XK0-006) band of LINUXFUND/shared-folder-permission-denied
// (LINUXPLUS/shared-folder-permission-denied-linuxplus.band.json): the same case and paths, registered to the
// LINUXPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./linuxfund-perms.steps.ts";

export const ENTRY = { course: "LINUXPLUS", slug: "shared-folder-permission-denied-linuxplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
