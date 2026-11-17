// REQ-320: golden paths for the AI901 band of SECAIPLUS/rag-assistant-data-leak
// (AI901/rag-assistant-data-leak-ai901.band.json): the same case and paths, registered to the
// AI901 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./ai-rag.steps.ts";

export const ENTRY = { course: "AI901", slug: "rag-assistant-data-leak-ai901" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
