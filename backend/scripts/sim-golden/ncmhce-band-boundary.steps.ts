// REQ-315: golden paths for the NCMHCE band of NCE/nce-boundary-dual-relationship
// (NCMHCE/ncmhce-boundary-dual-relationship.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps ncmhce-band-boundary
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./nce-boundary.steps.ts";

export const ENTRY = { course: "NCMHCE", slug: "ncmhce-boundary-dual-relationship" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
