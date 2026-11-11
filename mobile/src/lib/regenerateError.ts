// What to tell the learner when "Regenerate lesson" fails. Duck-typed on
// `status` (ApiError in src/api/client.ts sets it) so this stays free of the
// API client's React Native globals and can be unit tested under node.

export const REGENERATE_RATE_LIMITED =
  "You've regenerated this lesson a few times already. Give it a few minutes, then try again.";
export const REGENERATE_FAILED = "Couldn't regenerate the lesson. Try again in a moment.";
// Only when the request never reached the server.
export const REGENERATE_OFFLINE = "Couldn't reach Ascendra to regenerate the lesson. Check your connection and try again.";

export function regenerateErrorMessage(err: unknown): string {
  const status = typeof err === "object" && err !== null ? (err as { status?: unknown }).status : undefined;
  // REQ-122: a plan limit (the week's new versions, the month's AI coaching,
  // or not in the plan) says so in the server's own words, which name when
  // it opens again.
  const data = typeof err === "object" && err !== null ? (err as { data?: any }).data : undefined;
  if ((status === 402 || status === 429) && data && (data.upgrade || data.allowance || data.aiPaused) && typeof data.error === "string") {
    return data.error;
  }
  // REQ-201: limited preview (403) or the global daily AI pause (429), in
  // the server's own words -- not "check your connection".
  if ((status === 403 || status === 429) && data && data.aiAccess && typeof data.error === "string") {
    return data.error;
  }
  // FAIL-884: a lesson the accuracy checks held back says so in the server's
  // own words ({ held: true }, a 409): what to do meanwhile, not "check your
  // connection".
  if (data && data.held === true && typeof data.error === "string" && data.error.trim()) return data.error;
  if (status === 429) return REGENERATE_RATE_LIMITED;
  // REQ-216 (H3): the server answered with words for the learner (a 409
  // "try again in a moment", a 502/503 "the AI coach is busy"): show them. A
  // sentence written by the server is never answered with "check your
  // connection".
  if (typeof status === "number" && data && typeof data.error === "string" && data.error.trim()) return data.error;
  // The server answered without words: not a connection problem either.
  if (typeof status === "number") return REGENERATE_FAILED;
  return REGENERATE_OFFLINE;
}
