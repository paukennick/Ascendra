// REQ-320: golden paths for the GCPGAIL band of SECAIPLUS/rag-assistant-data-leak
// (GCPGAIL/rag-assistant-data-leak-gail.band.json): the same case and paths, registered to the
// GCPGAIL objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./ai-rag.steps.ts";

export const ENTRY = { course: "GCPGAIL", slug: "rag-assistant-data-leak-gail" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
