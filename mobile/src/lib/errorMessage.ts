// REQ-113 (Audit 3 mobile M7): one calm message for every way a request can
// fail before the server's own answer reaches the app.
//
// The API client parsed the response body outside its error handling, so a
// Wi-Fi sign-in page or a proxy's HTML error page surfaced as
// "SyntaxError: Unexpected token '<'...", the HTTP status was lost (so the
// session refresh on 401 and the rate-limit message on 429 never ran), and
// most screens printed that raw text. This module decides what a learner
// reads; src/api/client.ts uses it so every screen gets it without change.

export const NETWORK_MESSAGE = "Couldn't reach Ascendra. Check your connection and try again.";
export const UNREADABLE_MESSAGE =
  "Ascendra's answer didn't come through (a Wi-Fi sign-in page or a network hiccup can do this). Try again in a moment.";
export const SERVER_MESSAGE = "Something went wrong on our side. Try again in a moment.";
export const TIMEOUT_MESSAGE = "The server took too long to respond. Check your connection and try again.";
export const KEPT_SUFFIX = " What you wrote is kept.";

// A fetch that never reached a server: offline, DNS, refused, aborted.
// React Native says "Network request failed"; browsers say "Failed to fetch"
// or "Load failed"; Node says "fetch failed".
export function isNetworkFailure(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.name === "TypeError" ||
    err.name === "AbortError" ||
    /network request failed|failed to fetch|load failed|fetch failed|network ?error/i.test(err.message)
  );
}

// The body of a response, parsed if it is JSON, or a marker if it isn't.
export function parseBody(text: string): { ok: true; data: unknown } | { ok: false } {
  if (!text) return { ok: true, data: null };
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

// The message for an HTTP error response. A JSON `error` string from our own
// server is written for learners and kept (wrong password, rate limit, not
// found...), except a 500, which says nothing useful to them. REQ-216 (H3):
// a 502 or 503 keeps the server's sentence too: the server answers a model
// outage ("The AI coach is busy...") or a paused feature in words written for
// the learner. A body that isn't our JSON (a portal or proxy page) gets the
// calm message.
export function httpErrorMessage(status: number, data: unknown, parsed: boolean): string {
  if (!parsed) return UNREADABLE_MESSAGE;
  const serverText = data && typeof data === "object" ? (data as { error?: unknown }).error : undefined;
  if (status >= 500 && !(status === 502 || status === 503)) return SERVER_MESSAGE;
  if (status >= 500 && !(typeof serverText === "string" && serverText.trim())) return SERVER_MESSAGE;
  if (typeof serverText === "string" && serverText.trim()) return serverText;
  if (status === 429) return "That's a lot of requests in a short time. Wait a minute and try again.";
  if (status === 404) return "That couldn't be found. It may have been removed.";
  return "That didn't work. Try again in a moment.";
}

// What a screen shows for any thrown error. Errors the client already made
// friendly pass through; anything raw (a SyntaxError, a TypeError from a
// failed fetch, an unknown throw) becomes a calm sentence. `kept` adds that
// the learner's typed text is still on screen.
export function friendlyError(err: unknown, opts: { kept?: boolean } = {}): string {
  const suffix = opts.kept ? KEPT_SUFFIX : "";
  if (err instanceof Error) {
    if ((err as { friendly?: boolean }).friendly) return err.message + suffix;
    if (err.name === "RequestTimeoutError") return TIMEOUT_MESSAGE + suffix;
    if (isNetworkFailure(err)) return NETWORK_MESSAGE + suffix;
    if (err.name === "SyntaxError") return UNREADABLE_MESSAGE + suffix;
    if (typeof (err as { status?: unknown }).status === "number") return err.message + suffix;
  }
  return "Something didn't work. Try again in a moment." + suffix;
}

// REQ-217 (FAIL-1045): the message for a failed sign-in-screen request. Offline,
// a timeout and a server answer show their own calm text; only an error with no
// message of its own gets the screen's fallback. These screens used to check
// `err instanceof ApiError`, so being offline read "Something went wrong".
export function messageOr(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const own =
      (err as { friendly?: boolean }).friendly ||
      err.name === "RequestTimeoutError" ||
      isNetworkFailure(err) ||
      typeof (err as { status?: unknown }).status === "number";
    if (own) return friendlyError(err);
  }
  return fallback;
}
