// REQ-333: golden paths for the CMPCBS band of ISC2CC/cc-ethics-shared-credentials
// (CMPCBS/ethics-shared-credentials-cmpcbs.band.json): the same case and paths, registered to the
// CMPCBS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./cc-ethics.steps.ts";

export const ENTRY = { course: "CMPCBS", slug: "ethics-shared-credentials-cmpcbs" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
