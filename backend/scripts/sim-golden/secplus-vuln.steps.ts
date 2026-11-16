// REQ-297: golden paths for the Security+ band of the CySA+ incident
// (SECPLUS/vuln-prioritization-kev-edge-secplus.band.json): the same incident and paths, registered to
// the SY0-701 objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cysa-vuln.steps.ts";

export const ENTRY = { course: "SECPLUS", slug: "vuln-prioritization-kev-edge-secplus" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
