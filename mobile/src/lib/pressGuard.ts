// The shared Button only stopped repeat taps through its loading/disabled
// props, and those change on the *next* render. Two taps delivered in the
// same frame both reached onPress, so "Submit" could send twice. This is the
// guard the Button keeps in a ref, where the state is updated synchronously.
//
// REQ-131: while an async handler is still running, further presses are
// ignored; and any press within SYNC_WINDOW_MS of the last accepted one is
// ignored, which covers handlers that return nothing to wait on.

export const SYNC_WINDOW_MS = 300;

export interface PressGuard {
  // Runs `handler` unless a press is already being handled. Returns true if
  // the handler ran. A handler that throws releases the guard and rethrows.
  press(handler: () => unknown): boolean;
}

function isThenable(v: unknown): v is PromiseLike<unknown> {
  return !!v && (typeof v === "object" || typeof v === "function") && typeof (v as { then?: unknown }).then === "function";
}

export function createPressGuard(now: () => number = Date.now, windowMs: number = SYNC_WINDOW_MS): PressGuard {
  let inFlight = false;
  let lastAccepted = -Infinity;
  return {
    press(handler) {
      if (inFlight) return false;
      const t = now();
      if (t - lastAccepted < windowMs) return false;
      lastAccepted = t;
      let out: unknown;
      try {
        out = handler();
      } catch (err) {
        inFlight = false;
        throw err;
      }
      if (isThenable(out)) {
        inFlight = true;
        const release = () => {
          inFlight = false;
        };
        // Release on either outcome. The rejection is not handled here: the
        // caller's own promise already carries it, as before the guard.
        Promise.resolve(out).then(release, release);
      }
      return true;
    },
  };
}
