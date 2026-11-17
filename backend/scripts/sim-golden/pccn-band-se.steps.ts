// REQ-323: golden paths for the PCCN band of CCRNADULT/status-epilepticus-after-craniotomy
// (PCCN/status-epilepticus-after-craniotomy-pccn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps pccn-band-se
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./ccrn-se.steps.ts";

export const ENTRY = { course: "PCCN", slug: "status-epilepticus-after-craniotomy-pccn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
