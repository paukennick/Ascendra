// REQ-321: golden paths for the Server+ (SK0-005) band of LINUXFUND/shared-folder-permission-denied
// (SERVERPLUS/shared-folder-permission-denied-serverplus.band.json): the same case and paths, registered to the
// SERVERPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./linuxfund-perms.steps.ts";

export const ENTRY = { course: "SERVERPLUS", slug: "shared-folder-permission-denied-serverplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
