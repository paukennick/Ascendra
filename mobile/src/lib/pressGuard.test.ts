import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { SYNC_WINDOW_MS, createPressGuard } from "./pressGuard.ts";

function clock(start = 1000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => void (t += ms) };
}
const tick = () => new Promise<void>((r) => setImmediate(r));

describe("press guard", () => {
  test("two presses in the same frame run the handler once", () => {
    const c = clock();
    const g = createPressGuard(c.now);
    let calls = 0;
    assert.equal(g.press(() => void calls++), true);
    assert.equal(g.press(() => void calls++), false);
    assert.equal(calls, 1);
  });
  test("a sync handler can run again once the window has passed", () => {
    const c = clock();
    const g = createPressGuard(c.now);
    let calls = 0;
    g.press(() => void calls++);
    c.advance(SYNC_WINDOW_MS - 1);
    assert.equal(g.press(() => void calls++), false);
    c.advance(1);
    assert.equal(g.press(() => void calls++), true);
    assert.equal(calls, 2);
  });
  test("an async handler blocks presses until it settles, however long it takes", async () => {
    const c = clock();
    const g = createPressGuard(c.now);
    let release!: () => void;
    let calls = 0;
    g.press(() => {
      calls++;
      return new Promise<void>((r) => (release = r));
    });
    c.advance(10_000); // far past the sync window; still in flight
    assert.equal(g.press(() => void calls++), false);
    release();
    await tick();
    assert.equal(g.press(() => void calls++), true);
    assert.equal(calls, 2);
  });
  test("a rejected async handler releases the guard", async () => {
    const c = clock();
    const g = createPressGuard(c.now);
    const failing = Promise.reject(new Error("boom"));
    failing.catch(() => {}); // the caller's own handling
    g.press(() => failing);
    await tick();
    c.advance(SYNC_WINDOW_MS);
    assert.equal(g.press(() => {}), true);
  });
  test("a handler that throws synchronously releases the guard and rethrows", () => {
    const c = clock();
    const g = createPressGuard(c.now);
    assert.throws(() => g.press(() => { throw new Error("sync"); }), /sync/);
    c.advance(SYNC_WINDOW_MS);
    assert.equal(g.press(() => {}), true);
  });
  test("non-promise return values (e.g. router.push) are treated as sync", () => {
    const c = clock();
    const g = createPressGuard(c.now);
    assert.equal(g.press(() => 42), true);
    c.advance(SYNC_WINDOW_MS);
    assert.equal(g.press(() => "ok"), true);
    c.advance(SYNC_WINDOW_MS);
    assert.equal(g.press(() => null), true);
  });
});
