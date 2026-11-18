// REQ-335: golden paths for the AI901 band of SECAIPLUS/agent-indirect-prompt-injection
// (AI901/agent-indirect-prompt-injection-ai901.band.json): the same case and paths, registered to the
// AI901 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./ai-inject.steps.ts";

export const ENTRY = { course: "AI901", slug: "agent-indirect-prompt-injection-ai901" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
