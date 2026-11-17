// REQ-316: golden paths for the Security+ (SY0-701) band of ISC2CC/cc-triage-phish-correlation
// (SECPLUS/triage-phish-correlation-secplus.band.json): the same case and paths, registered to the
// SECPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cc-triage.steps.ts";

export const ENTRY = { course: "SECPLUS", slug: "triage-phish-correlation-secplus" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
