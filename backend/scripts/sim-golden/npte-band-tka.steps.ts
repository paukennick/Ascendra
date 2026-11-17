// REQ-315: golden paths for the NPTE-PT band of DPT/tka-gait-dvt-red-flag
// (NPTEPT/tka-gait-dvt-red-flag-npte.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps npte-band-tka
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dpt-tka.steps.ts";

export const ENTRY = { course: "NPTEPT", slug: "tka-gait-dvt-red-flag-npte" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
