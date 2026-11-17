// REQ-316: golden paths for the Linux+ (XK0-006) band of LINUXFUND/nightly-backup-missing
// (LINUXPLUS/nightly-backup-missing-linuxplus.band.json): the same case and paths, registered to the
// LINUXPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./linuxfund-journal.steps.ts";

export const ENTRY = { course: "LINUXPLUS", slug: "nightly-backup-missing-linuxplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
