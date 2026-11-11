// REQ-217 (FAIL-1064): a few study routes answer 200 with `locked` instead of
// refusing, when the learner's plan doesn't include the feature (the unit check
// and the look-alike comparisons: backend featureLock). The screens only read
// the fields they knew -- the unit check showed its title and nothing else, the
// comparisons said "No look-alike concepts were found" -- so the learner was
// never told it was their plan. This reads the server's own wording.
export function lockedMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const locked = (data as { locked?: unknown }).locked;
  if (!locked || typeof locked !== "object") return null;
  const message = (locked as { message?: unknown }).message;
  return typeof message === "string" && message.trim() ? message.trim() : "This is part of a plan you don't have yet.";
}

export const LOCKED_TITLE = "Not in your plan";
