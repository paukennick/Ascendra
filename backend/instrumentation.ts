// Runs once when a Next.js server instance starts (Next.js instrumentation
// hook). REQ-116: a production server with a placeholder secret refuses to
// start rather than serve requests signed with a key published in this repo.
export async function register() {
  const { assertNoPlaceholderSecrets } = await import("./lib/env-check");
  assertNoPlaceholderSecrets();
}
