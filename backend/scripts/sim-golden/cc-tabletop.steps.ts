// REQ-313: golden paths for the ISC2CC band of cism-ransomware-tabletop
// (ISC2CC/cc-ransomware-tabletop.band.json): the same case and paths, registered to the
// ISC2CC objective (docs/sims.md 22.26).
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cism-tabletop.steps.ts";

export const ENTRY = { course: "ISC2CC", slug: "cc-ransomware-tabletop" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
