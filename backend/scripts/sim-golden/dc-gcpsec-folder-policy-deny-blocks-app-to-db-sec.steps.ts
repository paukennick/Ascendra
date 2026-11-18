// REQ-335: golden paths for the GCPSEC band of GCPNET/folder-policy-deny-blocks-app-to-db
// (GCPSEC/folder-policy-deny-blocks-app-to-db-sec.band.json): the same case and paths, registered to the
// GCPSEC objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./gcpnet-conntest.steps.ts";

export const ENTRY = { course: "GCPSEC", slug: "folder-policy-deny-blocks-app-to-db-sec" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
