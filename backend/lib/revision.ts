import { badRequest, conflict, notFound } from "@/lib/http";
import type { RetryLookup, RetryTarget } from "@/lib/grading-service";

// REQ-105: the HTTP answer to a request that revises a missed answer
// (retryOf), shared by /api/grade and /api/pbq. null = the revision may go
// ahead. `sameItem` checks the revised attempt is for the item being answered
// now (a revision of a different question is refused).
export const ALREADY_REVISED = "You've already revised this answer once. A new question is the next step.";

// The PBQ sub-parts a revision covers: the scenario's own labels that the
// revised attempt listed as missed (case and spacing ignored). If it named
// none that match -- an "incorrect" verdict with an empty list, or labels the
// grader reworded -- the revision covers every sub-part.
export function partsToRevise(subParts: string[], missed: unknown): string[] {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const want = new Set(
    Array.isArray(missed) ? missed.filter((m): m is string => typeof m === "string").map(norm) : []
  );
  const hit = subParts.filter((p) => want.has(norm(p)));
  return hit.length ? hit : [...subParts];
}

export function retryRefusal(found: RetryLookup, sameItem: (t: RetryTarget) => boolean) {
  switch (found.status) {
    case "not-found":
      return notFound("The answer being revised was not found");
    case "is-revision":
      return badRequest("A revision can't be revised again.");
    case "not-a-miss":
      return badRequest("Only a missed answer can be revised.");
    case "already-revised":
      return conflict(ALREADY_REVISED);
    case "ok":
      return sameItem(found.target) ? null : badRequest("retryOf is an answer to a different question");
  }
}
