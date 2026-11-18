// REQ-333: golden paths for the PYTHON band of PCEP/pcep-audit-log-write-mode
// (PYTHON/audit-log-write-mode-python.band.json): the same case and paths, registered to the
// PYTHON objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./pcep-filemode.steps.ts";

export const ENTRY = { course: "PYTHON", slug: "audit-log-write-mode-python" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
