// REQ-335: golden paths for the GCPACE band of GCPNET/folder-policy-deny-blocks-app-to-db
// (GCPACE/folder-policy-deny-blocks-app-to-db-ace.band.json): the same case and paths, registered to the
// GCPACE objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpnet-conntest.steps.ts";

export const ENTRY = { course: "GCPACE", slug: "folder-policy-deny-blocks-app-to-db-ace" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
