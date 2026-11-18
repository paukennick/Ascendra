// REQ-333: golden paths for the PYAUTO band of TSNODE/node-env-file-silent-exit
// (PYAUTO/node-env-file-silent-exit-pyauto.band.json): the same case and paths, registered to the
// PYAUTO objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./node-envfile.steps.ts";

export const ENTRY = { course: "PYAUTO", slug: "node-env-file-silent-exit-pyauto" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
