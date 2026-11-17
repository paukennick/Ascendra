// REQ-316: golden paths for the Network+ (N10-009) band of CISSP/cissp-ransomware-recovery-site
// (NETWORKPLUS/ransomware-recovery-site-netplus.band.json): the same case and paths, registered to the
// NETWORKPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cissp-recovery.steps.ts";

export const ENTRY = { course: "NETWORKPLUS", slug: "ransomware-recovery-site-netplus" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
