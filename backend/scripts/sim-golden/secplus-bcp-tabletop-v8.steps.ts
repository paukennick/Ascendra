// REQ-313: golden paths for the SECPLUSV8 band of cissp-flood-continuity-tabletop
// (SECPLUSV8/flood-continuity-tabletop-v8.band.json): the same exercise and paths, registered to the
// SECPLUSV8 objective (docs/sims.md 22.26).
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cissp-bcp-tabletop.steps.ts";

export const ENTRY = { course: "SECPLUSV8", slug: "flood-continuity-tabletop-v8" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
