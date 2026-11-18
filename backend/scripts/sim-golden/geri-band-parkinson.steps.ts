// REQ-334: golden paths for the Geriatrics band of DPT/parkinson-freezing-session
// (ABPTSGCS/parkinson-freezing-session-geri.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps geri-band-parkinson
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dpt-parkinson.steps.ts";

export const ENTRY = { course: "ABPTSGCS", slug: "parkinson-freezing-session-geri" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
