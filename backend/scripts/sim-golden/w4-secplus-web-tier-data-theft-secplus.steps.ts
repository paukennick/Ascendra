// REQ-316: golden paths for the Security+ (SY0-701) band of CISSP/cissp-web-tier-data-theft
// (SECPLUS/web-tier-data-theft-secplus.band.json): the same case and paths, registered to the
// SECPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cissp-incident.steps.ts";

export const ENTRY = { course: "SECPLUS", slug: "web-tier-data-theft-secplus" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
