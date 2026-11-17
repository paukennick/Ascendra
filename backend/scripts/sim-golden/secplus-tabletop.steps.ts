// REQ-313: golden paths for the SECPLUS band of cism-ransomware-tabletop
// (SECPLUS/ransomware-tabletop-secplus.band.json): the same case and paths, registered to the
// SECPLUS objective (docs/sims.md 22.26).
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cism-tabletop.steps.ts";

export const ENTRY = { course: "SECPLUS", slug: "ransomware-tabletop-secplus" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
