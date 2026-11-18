// REQ-335: golden paths for the AWSDVA band of AWSDEA/s3-eventbridge-rule-never-fires
// (AWSDVA/s3-eventbridge-rule-never-fires-dva.band.json): the same case and paths, registered to the
// AWSDVA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dea-s3-eventbridge.steps.ts";

export const ENTRY = { course: "AWSDVA", slug: "s3-eventbridge-rule-never-fires-dva" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
