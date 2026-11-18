// REQ-335: golden paths for the AWSMLA band of SECAIPLUS/rag-assistant-data-leak
// (AWSMLA/rag-assistant-data-leak-mla.band.json): the same case and paths, registered to the
// AWSMLA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./ai-rag.steps.ts";

export const ENTRY = { course: "AWSMLA", slug: "rag-assistant-data-leak-mla" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
