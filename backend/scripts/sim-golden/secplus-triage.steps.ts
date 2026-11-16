// REQ-297: golden paths for the Security+ band of the CySA+ incident
// (SECPLUS/alert-triage-lolbin-hunt-secplus.band.json): the same incident and paths, registered to
// the SY0-701 objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cysa-triage.steps.ts";

export const ENTRY = { course: "SECPLUS", slug: "alert-triage-lolbin-hunt-secplus" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
