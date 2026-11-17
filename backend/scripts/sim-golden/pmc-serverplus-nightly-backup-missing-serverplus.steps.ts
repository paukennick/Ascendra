// REQ-321: golden paths for the Server+ (SK0-005) band of LINUXFUND/nightly-backup-missing
// (SERVERPLUS/nightly-backup-missing-serverplus.band.json): the same case and paths, registered to the
// SERVERPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./linuxfund-journal.steps.ts";

export const ENTRY = { course: "SERVERPLUS", slug: "nightly-backup-missing-serverplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
