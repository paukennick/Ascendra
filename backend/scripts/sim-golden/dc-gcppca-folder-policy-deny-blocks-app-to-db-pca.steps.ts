// REQ-335: golden paths for the GCPPCA band of GCPNET/folder-policy-deny-blocks-app-to-db
// (GCPPCA/folder-policy-deny-blocks-app-to-db-pca.band.json): the same case and paths, registered to the
// GCPPCA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpnet-conntest.steps.ts";

export const ENTRY = { course: "GCPPCA", slug: "folder-policy-deny-blocks-app-to-db-pca" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
