import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BACKGROUND_HOLD_MAX_MS, SETTLE_CHECK_MS, createBackgroundHold, withBackgroundHold } from "./backgroundHold.ts";
import { createLocalDataGuard, localDataOwner, userLocalDataKeys } from "./localData.ts";
import { installWebLeaveGuard, type WebWindowLike } from "./webLeaveGuard.ts";
import { createLatestRequest } from "./latestRequest.ts";
import { chatDraftKey, pbqDraftKey, supportDraftKey } from "./drafts.ts";
import { snapshotStorageKey } from "./lessonProgress.ts";

const GRACE = 1500;

describe("background sign-out hold (FAIL-062)", () => {
  test("no hold: the usual grace period", () => {
    const h = createBackgroundHold();
    assert.equal(h.signOutDelay(1_000, GRACE), GRACE);
    assert.equal(h.isHeld(1_000), false);
  });
  test("an open share sheet or picker defers the sign-out until the hold expires", () => {
    const h = createBackgroundHold();
    h.begin(0);
    h.noteBackground();
    assert.equal(h.signOutDelay(500, GRACE), BACKGROUND_HOLD_MAX_MS - 500);
    assert.equal(h.isHeld(500), true);
  });
  test("the hold is bounded: past the cap, the grace period applies again", () => {
    const h = createBackgroundHold();
    h.begin(0);
    h.noteBackground();
    assert.equal(h.signOutDelay(BACKGROUND_HOLD_MAX_MS + 1, GRACE), GRACE);
    assert.equal(h.isHeld(BACKGROUND_HOLD_MAX_MS), false);
  });
  test("returning to the app ends the hold", () => {
    const h = createBackgroundHold();
    h.begin(0);
    h.noteBackground();
    h.clear();
    assert.equal(h.signOutDelay(10, GRACE), GRACE);
  });
  test("Android: Share resolves before the app backgrounds, so settling after a background keeps the hold", () => {
    const h = createBackgroundHold();
    const t = h.begin(0);
    h.noteBackground();
    h.settle(t);
    assert.equal(h.isHeld(10), true);
  });
  test("iOS: a sheet drawn inside the app never backgrounds, so settling ends the hold", () => {
    const h = createBackgroundHold();
    const t = h.begin(0);
    h.settle(t);
    assert.equal(h.isHeld(10), false);
    assert.equal(h.signOutDelay(10, GRACE), GRACE);
  });
  test("an older opener settling does not end a newer hold", () => {
    const h = createBackgroundHold();
    const first = h.begin(0);
    h.begin(100);
    h.settle(first);
    assert.equal(h.isHeld(200), true);
  });
  test("withBackgroundHold holds while open and checks the settle a moment later", async () => {
    const h = createBackgroundHold();
    let heldDuring = false;
    const out = await withBackgroundHold(async () => {
      heldDuring = h.isHeld(Date.now());
      return 7;
    }, h);
    assert.equal(out, 7);
    assert.equal(heldDuring, true);
    assert.equal(h.isHeld(Date.now()), true, "not released at once: Android resolves before backgrounding");
    await new Promise((r) => setTimeout(r, SETTLE_CHECK_MS + 50));
    assert.equal(h.isHeld(Date.now()), false);
  });
  test("withBackgroundHold rethrows the opener's error", async () => {
    const h = createBackgroundHold();
    await assert.rejects(
      withBackgroundHold(() => Promise.reject(new Error("no share")), h),
      /no share/
    );
  });
});

describe("local data removed on logout (FAIL-070)", () => {
  const me = "11111111-2222-3333-4444-555555555555";
  const other = "99999999-2222-3333-4444-555555555555";
  const keys = [
    chatDraftKey(me, "t1"),
    supportDraftKey(me, "ticket"),
    supportDraftKey(me, "course_request"),
    pbqDraftKey(me, "u1"),
    snapshotStorageKey(me, "o1"),
    chatDraftKey(other, "t1"),
    pbqDraftKey(other, "u1"),
    snapshotStorageKey(other, "o1"),
    "ascendra.lessonProgress.anon.o1",
    "ascendra_refresh_token",
    "ascendra.theme",
    "other-app.draft.chat." + me + ".t1",
  ];
  test("every draft, PBQ and lesson-position key of that user, and nothing else", () => {
    assert.deepEqual(userLocalDataKeys(keys, me).sort(), [
      chatDraftKey(me, "t1"),
      supportDraftKey(me, "course_request"),
      supportDraftKey(me, "ticket"),
      pbqDraftKey(me, "u1"),
      snapshotStorageKey(me, "o1"),
    ].sort());
  });
  test("another user's keys and unrelated keys are kept", () => {
    const mine = new Set(userLocalDataKeys(keys, me));
    assert.equal(mine.has(chatDraftKey(other, "t1")), false);
    assert.equal(mine.has("ascendra_refresh_token"), false);
    assert.equal(mine.has("ascendra.theme"), false);
  });
  test("an empty user id matches nothing", () => {
    assert.deepEqual(userLocalDataKeys(keys, ""), []);
  });
  test("key owners", () => {
    assert.equal(localDataOwner(chatDraftKey(me, "t")), me);
    assert.equal(localDataOwner(pbqDraftKey(me, "u")), me);
    assert.equal(localDataOwner(snapshotStorageKey(me, "o")), me);
    assert.equal(localDataOwner("ascendra.draft.chat"), null);
    assert.equal(localDataOwner("ascendra.theme"), null);
  });
  test("after logout, a screen flushing on its way out can't write that user's draft back", () => {
    const g = createLocalDataGuard();
    g.loggedOut(me);
    assert.equal(g.mayWrite(supportDraftKey(me, "ticket")), false);
    assert.equal(g.mayWrite(supportDraftKey(other, "ticket")), true);
    assert.equal(g.mayWrite("ascendra.theme"), true);
    assert.equal(g.isLoggedOut(me), true);
    g.signedIn(me);
    assert.equal(g.mayWrite(supportDraftKey(me, "ticket")), true);
    assert.equal(g.isLoggedOut(me), false);
  });
});

// A window stand-in. Events dispatched at window follow the DOM rule for the
// target itself: capture listeners run before bubble listeners, whatever the
// order they were added in (Node's own EventTarget does not model this).
// history.back/forward fire popstate synchronously, as a browser does a
// moment later.
type L = (e: Event) => void;
function fakeWindow() {
  const listeners: { type: string; l: L; capture: boolean }[] = [];
  const capture = (o?: boolean | { capture?: boolean }) => (typeof o === "boolean" ? o : !!o?.capture);
  const dispatch = (e: Event) => {
    let stopped = false;
    const orig = e.stopImmediatePropagation.bind(e);
    e.stopImmediatePropagation = () => {
      stopped = true;
      orig();
    };
    const ordered = [...listeners.filter((x) => x.capture), ...listeners.filter((x) => !x.capture)];
    for (const x of ordered) {
      if (stopped) break;
      if (x.type === e.type) x.l(e);
    }
    return e;
  };
  const calls: string[] = [];
  let routerSaw = 0;
  // Added first and in the bubble phase, like expo-router's history listener.
  listeners.push({ type: "popstate", l: () => (routerSaw += 1), capture: false });
  const win: WebWindowLike = {
    addEventListener: (type, l, o) => listeners.push({ type, l, capture: capture(o) }),
    removeEventListener: (type, l, o) => {
      const i = listeners.findIndex((x) => x.type === type && x.l === l && x.capture === capture(o));
      if (i >= 0) listeners.splice(i, 1);
    },
    history: {
      back() {
        calls.push("back");
        dispatch(new Event("popstate"));
      },
      forward() {
        calls.push("forward");
        dispatch(new Event("popstate"));
      },
    },
  };
  return {
    win,
    calls,
    routerSaw: () => routerSaw,
    browserBack: () => dispatch(new Event("popstate")),
    unload: () => dispatch(new Event("beforeunload", { cancelable: true })),
  };
}

describe("web leave guard for backup codes (FAIL-063)", () => {
  test("refresh / tab close asks the browser to confirm while active", () => {
    const w = fakeWindow();
    installWebLeaveGuard(w.win, () => true, () => {});
    assert.equal(w.unload().defaultPrevented, true);
  });
  test("not active: no prompt, back goes straight through", () => {
    const w = fakeWindow();
    installWebLeaveGuard(w.win, () => false, () => assert.fail("should not ask"));
    assert.equal(w.unload().defaultPrevented, false);
    w.browserBack();
    assert.equal(w.routerSaw(), 1);
  });
  test("browser back is kept from the router, undone, and the learner is asked", () => {
    const w = fakeWindow();
    let leave: (() => void) | null = null;
    installWebLeaveGuard(w.win, () => true, (l) => {
      leave = l;
    });
    w.browserBack();
    assert.equal(w.routerSaw(), 0, "the router never saw the back or the forward step");
    assert.deepEqual(w.calls, ["forward"]);
    assert.ok(leave);
    // "I've saved them": goes back for real, and the router handles it.
    leave!();
    assert.deepEqual(w.calls, ["forward", "back"]);
    assert.equal(w.routerSaw(), 1);
  });
  test("removing the guard removes both listeners", () => {
    const w = fakeWindow();
    const off = installWebLeaveGuard(w.win, () => true, () => assert.fail("removed"));
    off();
    assert.equal(w.unload().defaultPrevented, false);
    w.browserBack();
    assert.equal(w.routerSaw(), 1);
  });
});

describe("only the newest filter's response is shown (FAIL-068)", () => {
  test("an older response arriving last is ignored", () => {
    const r = createLatestRequest();
    const lessonFilter = r.begin();
    const pbqFilter = r.begin();
    assert.equal(r.isLatest(pbqFilter), true);
    assert.equal(r.isLatest(lessonFilter), false);
  });
  test("a single request is its own latest", () => {
    const r = createLatestRequest();
    assert.equal(r.isLatest(r.begin()), true);
  });
});
