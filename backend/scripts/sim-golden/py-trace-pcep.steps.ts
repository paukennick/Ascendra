// REQ-312: golden paths for the PCEP band of the PYTHON traceback case
// (PCEP/py-import-crash-traceback-pcep.band.json): the same case and paths,
// registered to the PCEP objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./py-trace.steps.ts";

export const ENTRY = { course: "PCEP", slug: "py-import-crash-traceback-pcep" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
