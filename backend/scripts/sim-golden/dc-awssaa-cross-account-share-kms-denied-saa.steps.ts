// REQ-335: golden paths for the AWSSAA band of AWSSAP/cross-account-share-kms-denied
// (AWSSAA/cross-account-share-kms-denied-saa.band.json): the same case and paths, registered to the
// AWSSAA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sap-kms-cross-account.steps.ts";

export const ENTRY = { course: "AWSSAA", slug: "cross-account-share-kms-denied-saa" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
