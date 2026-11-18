// REQ-337 (docs/sims.md 22.41): golden paths for the EPPP band of WAPSYCHJP/wajp-adult-disclosure-children-at-risk
// (EPPP/eppp-adult-disclosure-children-at-risk.band.json): the same case and paths, registered to this course's objective.
//   npm run sim:golden -- steps eppp-band-report
import type { StepsSpec } from "./steps.ts";
import { paths } from "./wajp-report.steps.ts";

export const ENTRY = { course: "EPPP", slug: "eppp-adult-disclosure-children-at-risk" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
