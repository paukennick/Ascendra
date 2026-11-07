// Web only. The MFA screen's "beforeRemove" guard (settings/mfa.tsx) never
// sees the browser's own ways out: expo-router answers the back button by
// calling navigation.resetRoot (expo-router/build/fork/useLinking.js), which
// does not fire beforeRemove, and a refresh or tab close never reaches React
// Navigation at all. So the backup codes, shown once, were lost with no
// prompt (Audit 2 mobile item 3, FAIL-063).
//
// While `isActive()` is true this:
//  - asks the browser to confirm a refresh, tab close or typed URL
//    ("beforeunload"; browsers show their own generic wording);
//  - catches the back button before expo-router does: a capture listener on
//    window runs before the router's bubble listener for the same event, so
//    stopImmediatePropagation keeps the router from resetting. The browser
//    has already moved back one entry, so it steps forward again (that
//    second popstate is swallowed too, leaving the router's own history
//    index where it was) and hands `onBackBlocked` a `leave` callback that
//    goes back for real.
//
// The window is passed in so the logic can be tested without a browser.

export interface WebWindowLike {
  addEventListener(type: string, listener: (e: Event) => void, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: (e: Event) => void, options?: boolean | EventListenerOptions): void;
  history: { back(): void; forward(): void };
}

export function installWebLeaveGuard(
  win: WebWindowLike,
  isActive: () => boolean,
  onBackBlocked: (leave: () => void) => void
): () => void {
  let restoring = false;
  let leaving = false;

  const onBeforeUnload = (e: Event) => {
    if (!isActive()) return;
    e.preventDefault();
    // Older browsers only prompt when returnValue is set.
    (e as unknown as { returnValue: string }).returnValue = "";
  };

  const onPopState = (e: Event) => {
    if (restoring) {
      // The forward step below: keep it from the router too.
      restoring = false;
      e.stopImmediatePropagation();
      return;
    }
    if (leaving) {
      leaving = false;
      return;
    }
    if (!isActive()) return;
    e.stopImmediatePropagation();
    restoring = true;
    win.history.forward();
    onBackBlocked(() => {
      leaving = true;
      win.history.back();
    });
  };

  win.addEventListener("beforeunload", onBeforeUnload);
  win.addEventListener("popstate", onPopState, true);
  return () => {
    win.removeEventListener("beforeunload", onBeforeUnload);
    win.removeEventListener("popstate", onPopState, true);
  };
}
