// REQ-337 (docs/sims.md 22.41): golden paths for the EPPP band of WAPSYCHJP/wajp-client-hired-by-your-practice
// (EPPP/eppp-client-hired-by-your-practice.band.json): the same case and paths, registered to this course's objective.
//   npm run sim:golden -- steps eppp-band-multiple
import type { StepsSpec } from "./steps.ts";
import { paths } from "./wajp-multiple.steps.ts";

export const ENTRY = { course: "EPPP", slug: "eppp-client-hired-by-your-practice" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
