// REQ-333: golden paths for the JAVASCRIPT band of TSNODE/node-env-file-silent-exit
// (JAVASCRIPT/node-env-file-silent-exit-javascript.band.json): the same case and paths, registered to the
// JAVASCRIPT objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./node-envfile.steps.ts";

export const ENTRY = { course: "JAVASCRIPT", slug: "node-env-file-silent-exit-javascript" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
