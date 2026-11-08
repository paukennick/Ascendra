import type { Instrumentation } from "next";
// Runs once when a Next.js server instance starts (Next.js instrumentation
// hook). REQ-116: a production server with a placeholder secret refuses to
// start rather than serve requests signed with a key published in this repo.
export async function register() {
  const { assertNoPlaceholderSecrets } = await import("./lib/env-check");
  assertNoPlaceholderSecrets();
}

// REQ-118: errors Next.js itself catches (outside our route handlers'
// serverError) go to the same error tracker; a no-op without a DSN. Only the
// route path is passed on, never headers or the body.
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  const { reportError } = await import("./lib/error-tracker");
  reportError(err, { route: request.path });
};
