// REQ-320: golden paths for the GCPGAIL band of SECAIPLUS/agent-indirect-prompt-injection
// (GCPGAIL/agent-indirect-prompt-injection-gail.band.json): the same case and paths, registered to the
// GCPGAIL objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./ai-inject.steps.ts";

export const ENTRY = { course: "GCPGAIL", slug: "agent-indirect-prompt-injection-gail" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
