// REQ-335: golden paths for the AWSSCS band of AWSSAP/cross-account-share-kms-denied
// (AWSSCS/cross-account-share-kms-denied-scs.band.json): the same case and paths, registered to the
// AWSSCS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sap-kms-cross-account.steps.ts";

export const ENTRY = { course: "AWSSCS", slug: "cross-account-share-kms-denied-scs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
