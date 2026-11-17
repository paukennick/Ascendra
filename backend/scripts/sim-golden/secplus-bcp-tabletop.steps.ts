// REQ-313: golden paths for the SECPLUS band of cissp-flood-continuity-tabletop
// (SECPLUS/flood-continuity-tabletop-secplus.band.json): the same exercise and paths, registered to the
// SECPLUS objective (docs/sims.md 22.26).
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cissp-bcp-tabletop.steps.ts";

export const ENTRY = { course: "SECPLUS", slug: "flood-continuity-tabletop-secplus" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
