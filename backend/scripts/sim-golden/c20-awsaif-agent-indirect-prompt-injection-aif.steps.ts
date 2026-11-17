// REQ-320: golden paths for the AWSAIF band of SECAIPLUS/agent-indirect-prompt-injection
// (AWSAIF/agent-indirect-prompt-injection-aif.band.json): the same case and paths, registered to the
// AWSAIF objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./ai-inject.steps.ts";

export const ENTRY = { course: "AWSAIF", slug: "agent-indirect-prompt-injection-aif" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
