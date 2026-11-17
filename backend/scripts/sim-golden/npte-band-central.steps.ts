// REQ-315: golden paths for the NPTE-PT band of DPT/dizziness-central-red-flags
// (NPTEPT/dizziness-central-red-flags-npte.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps npte-band-central
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dpt-central.steps.ts";

export const ENTRY = { course: "NPTEPT", slug: "dizziness-central-red-flags-npte" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
