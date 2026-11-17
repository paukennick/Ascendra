// REQ-315: golden paths for the NCE band of NCMHCE/ncmhce-suicide-safety-plan
// (NCE/nce-suicide-safety-plan.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps nce-band-safety
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./ncmhce-suicide.steps.ts";

export const ENTRY = { course: "NCE", slug: "nce-suicide-safety-plan" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
