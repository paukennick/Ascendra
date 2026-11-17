// REQ-321: golden paths for the AutoOps+ (AT0-001) band of PYTHON/py-import-crash-traceback
// (AUTOOPSPLUS/py-import-crash-traceback-autoopsplus.band.json): the same case and paths, registered to the
// AUTOOPSPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./py-trace.steps.ts";

export const ENTRY = { course: "AUTOOPSPLUS", slug: "py-import-crash-traceback-autoopsplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
