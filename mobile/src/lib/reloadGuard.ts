// REQ-339 (FAIL-2553): an over-the-air update's reload (Updates.reloadAsync)
// ends the JavaScript at once. If a refresh is in flight, the server has
// already rotated the token and the app never stores the new one, so the
// next launch sends a spent token and the server ends the session as stolen.
// Every reload asks the session first: AuthContext registers its token
// vault's quiesce() here, which stops new refreshes and waits for the one in
// flight to be stored.
//
// A silent reload (the five-minute return) is skipped when the session does
// not settle quickly; the banner offers it instead. A reload the learner asked
// for waits longer and then goes ahead (the request has its own timeout).

export type ReloadGuard = (timeoutMs: number) => Promise<boolean>;

export const SILENT_RELOAD_WAIT_MS = 5_000;
export const ASKED_RELOAD_WAIT_MS = 30_000;

let guard: ReloadGuard | null = null;
let release: (() => void) | null = null;

export function registerReloadGuard(fn: ReloadGuard, onCancel: () => void): () => void {
  guard = fn;
  release = onCancel;
  return () => {
    if (guard === fn) {
      guard = null;
      release = null;
    }
  };
}

// True: reload now. False: don't (the stop on refreshes is lifted again).
export async function prepareForReload(opts: { silent: boolean }): Promise<boolean> {
  if (!guard) return true;
  const settled = await guard(opts.silent ? SILENT_RELOAD_WAIT_MS : ASKED_RELOAD_WAIT_MS).catch(() => false);
  return settled || !opts.silent;
}

// The reload failed (reloadAsync threw): let refreshes run again.
export function reloadAbandoned(): void {
  release?.();
}
