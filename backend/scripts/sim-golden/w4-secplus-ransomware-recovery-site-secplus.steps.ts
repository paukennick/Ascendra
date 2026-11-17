// REQ-316: golden paths for the Security+ (SY0-701) band of CISSP/cissp-ransomware-recovery-site
// (SECPLUS/ransomware-recovery-site-secplus.band.json): the same case and paths, registered to the
// SECPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cissp-recovery.steps.ts";

export const ENTRY = { course: "SECPLUS", slug: "ransomware-recovery-site-secplus" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
