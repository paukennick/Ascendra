// REQ-335: golden paths for the AWSMLA band of SECAIPLUS/agent-indirect-prompt-injection
// (AWSMLA/agent-indirect-prompt-injection-mla.band.json): the same case and paths, registered to the
// AWSMLA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./ai-inject.steps.ts";

export const ENTRY = { course: "AWSMLA", slug: "agent-indirect-prompt-injection-mla" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
