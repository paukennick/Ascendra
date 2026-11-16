// REQ-289: golden paths for the Washington jurisprudence band of the EPPP duty-to-protect session
// (WAPSYCHJP/wajp-duty-to-protect-threat.band.json): the same session and paths, registered to this course's objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./eppp-duty.steps.ts";

export const ENTRY = { course: "WAPSYCHJP", slug: "wajp-duty-to-protect-threat" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
