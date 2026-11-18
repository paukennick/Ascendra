// REQ-334: golden paths for the BSN-RN band of NCLEXRN/preop-consent-after-opioid
// (BSNRN/preop-consent-after-opioid-bsn.band.json): the same case and paths, registered to this course's objective.
//
//   npm run sim:golden -- steps bsn-band-consent
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./rn-consent.steps.ts";

export const ENTRY = { course: "BSNRN", slug: "preop-consent-after-opioid-bsn" };

export function spec(golden: string): StepsSpec {
  return { ...(baseSpec as (g: string) => StepsSpec)(golden), slug: ENTRY.slug };
}
