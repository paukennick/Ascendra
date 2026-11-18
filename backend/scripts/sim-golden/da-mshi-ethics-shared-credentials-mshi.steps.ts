// REQ-333: golden paths for the MSHI band of ISC2CC/cc-ethics-shared-credentials
// (MSHI/ethics-shared-credentials-mshi.band.json): the same case and paths, registered to the
// MSHI objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./cc-ethics.steps.ts";

export const ENTRY = { course: "MSHI", slug: "ethics-shared-credentials-mshi" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
