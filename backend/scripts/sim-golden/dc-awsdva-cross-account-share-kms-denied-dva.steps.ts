// REQ-335: golden paths for the AWSDVA band of AWSSAP/cross-account-share-kms-denied
// (AWSDVA/cross-account-share-kms-denied-dva.band.json): the same case and paths, registered to the
// AWSDVA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sap-kms-cross-account.steps.ts";

export const ENTRY = { course: "AWSDVA", slug: "cross-account-share-kms-denied-dva" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
