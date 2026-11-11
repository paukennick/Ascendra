import type { Instrumentation } from "next";
// Runs once when a Next.js server instance starts (Next.js instrumentation
// hook). REQ-116: a production server with a placeholder secret refuses to
// start rather than serve requests signed with a key published in this repo.
export async function register() {
  const { assertSafeProductionConfig } = await import("./lib/env-check");
  assertSafeProductionConfig();
}

// REQ-118: errors Next.js itself catches (outside our route handlers'
// serverError) go to the same error tracker; a no-op without a DSN. Only the
// route path is passed on, never headers or the body.
//
// FAIL-945: the send is awaited. Next's docs for onRequestError say async work
// in it must be awaited, and Next keeps the invocation alive for the hook, so
// the report is not lost to a frozen function. (reportError() is the
// after()-based path for code inside a route handler.)
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  const { sendErrorReport, routeOnly } = await import("./lib/error-tracker");
  // FAIL-1106: the path without its query string (one-time tokens ride there).
  await sendErrorReport(err, { route: routeOnly(request.path) });
};
