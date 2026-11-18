// REQ-337 (docs/sims.md 22.41): golden paths for the NCMHCE band of NCE/nce-stress-and-insomnia-after-the-shop-closed
// (NCMHCE/ncmhce-stress-and-insomnia-after-the-shop-closed.band.json): the same case and paths, registered to this course's objective.
//   npm run sim:golden -- steps ncmhce-band-hopeless
import type { StepsSpec } from "./steps.ts";
import { paths } from "./nce-hopeless.steps.ts";

export const ENTRY = { course: "NCMHCE", slug: "ncmhce-stress-and-insomnia-after-the-shop-closed" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
