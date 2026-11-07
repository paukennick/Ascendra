// What to tell the learner when "Regenerate lesson" fails. Duck-typed on
// `status` (ApiError in src/api/client.ts sets it) so this stays free of the
// API client's React Native globals and can be unit tested under node.

export const REGENERATE_RATE_LIMITED =
  "You've regenerated this lesson a few times already. Give it a few minutes, then try again.";
export const REGENERATE_FAILED = "Couldn't regenerate the lesson. Check your connection and try again.";

export function regenerateErrorMessage(err: unknown): string {
  const status = typeof err === "object" && err !== null ? (err as { status?: unknown }).status : undefined;
  if (status === 429) return REGENERATE_RATE_LIMITED;
  return REGENERATE_FAILED;
}
