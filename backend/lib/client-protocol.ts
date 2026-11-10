// REQ-146: which app protocol a request came from. App builds from before
// the 2026-11-07 release send no X-Ascendra-Client header; the app sends one
// from REQ-146 on (mobile/src/api/client.ts, native and web). The number only
// goes up, when the server must tell a newer app apart from an older one.
//
//   absent / unreadable -- an app build from before REQ-146 (the store build
//                          at c3e13ab), or a direct API call
//   1                   -- knows the Solo choices hint (REQ-134): the lesson
//                          payload carries no Solo choices and the app fetches
//                          them from POST /api/objectives/:id/hint
//   2                   -- also renders interactive lab parts (REQ-189):
//                          order, match, select, command and numeric controls.
//                          Below 2 the lab view writes their options into
//                          the step text, and a written answer to one is
//                          graded by the model (lib/lab-interactive.ts).
//
// The header is not trusted for anything that matters to integrity: a caller
// that leaves it off gets the Solo choices in the lesson AND the hint reveal
// recorded, exactly as if it had asked the hint route (FAIL-530).
export const CLIENT_PROTOCOL_HEADER = "X-Ascendra-Client";

// Protocol number from which the app fetches Solo choices from the hint route.
export const HINT_AWARE_PROTOCOL = 1;

// The protocol a request declares, or 0 when it declares none (or garbage).
export function clientProtocol(req: Request): number {
  const raw = req.headers.get(CLIENT_PROTOCOL_HEADER)?.trim() ?? "";
  if (!/^\d{1,6}$/.test(raw)) return 0;
  return Number(raw);
}

// Protocol number from which the app renders interactive lab parts.
export const LAB_INTERACTIVE_PROTOCOL = 2;

export function rendersInteractiveLabs(req: Request): boolean {
  return clientProtocol(req) >= LAB_INTERACTIVE_PROTOCOL;
}

export function isHintAwareClient(req: Request): boolean {
  return clientProtocol(req) >= HINT_AWARE_PROTOCOL;
}
