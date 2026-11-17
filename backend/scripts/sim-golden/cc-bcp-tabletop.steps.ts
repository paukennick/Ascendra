// REQ-313: golden paths for the ISC2CC band of cissp-flood-continuity-tabletop
// (ISC2CC/cc-flood-continuity-tabletop.band.json): the same exercise and paths, registered to the
// ISC2CC objective (docs/sims.md 22.26).
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cissp-bcp-tabletop.steps.ts";

export const ENTRY = { course: "ISC2CC", slug: "cc-flood-continuity-tabletop" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
