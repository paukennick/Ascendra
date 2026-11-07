// REQ-116 (audit 3, finding 3): a client attempt id replays only the item it
// was recorded for.
//
// The review answer, comparison answer, explain-back and unit-check routes
// returned the stored result for ANY of the learner's own client attempt
// ids before looking at the item. Reusing an old id on an unanswered review
// question or comparison card therefore sent back that item's correct
// answer and explanation, without recording an answer or marking the
// question as helped. /api/grade and /api/pbq already refused this with a
// 409 (sameAttempt in lib/grading-service.ts); these routes now do the same
// check against the item they were asked about: same objective (or unit
// check item), same kind and stage, and the same question text where the
// route knows it.

export interface ReplayTarget {
  objectiveId?: string | null;
  unitCheckItemId?: string | null;
  kind: string;
  stage?: string | null;
  question?: string;
}

const id = (v: unknown) => (typeof v === "string" && v ? v.toLowerCase() : null);

export function replayMatches(stored: Record<string, unknown>, target: ReplayTarget): boolean {
  if (stored.kind !== target.kind) return false;
  if (target.stage !== undefined && (stored.stage ?? null) !== (target.stage ?? null)) return false;
  if (target.objectiveId !== undefined && id(stored.objective_id) !== id(target.objectiveId)) return false;
  if (target.unitCheckItemId !== undefined && id(stored.unit_check_item_id) !== id(target.unitCheckItemId)) return false;
  if (target.question !== undefined && stored.question !== target.question) return false;
  return true;
}

export const REPLAY_CONFLICT = "This id was already used for a different question.";
