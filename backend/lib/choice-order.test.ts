// REQ-097: per-learner shuffle of lesson choices.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  lessonItemKey,
  presentationOrder,
  presentationSeed,
  shownIndexOf,
  shuffleForPresentation,
  storedIndexAt,
} from "./choice-order";

describe("presentationOrder", () => {
  test("is a permutation and the same for the same seed", () => {
    for (let i = 0; i < 50; i++) {
      const seed = presentationSeed(`u${i}`, "o", "fade", "q");
      const a = presentationOrder(seed, 4);
      assert.deepEqual([...a].sort(), [0, 1, 2, 3]);
      assert.deepEqual(presentationOrder(seed, 4), a);
    }
  });

  test("puts the stored first choice in every position, roughly evenly", () => {
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 4000; i++) counts[shownIndexOf(presentationOrder(`seed-${i}`, 4), 0)]++;
    for (const c of counts) assert.ok(c > 850 && c < 1150, `uneven: ${counts}`);
  });

  test("shown and stored positions map back and forth", () => {
    const order = presentationOrder("x", 4);
    const shown = shuffleForPresentation(["a", "b", "c", "d"], order);
    for (let s = 0; s < 4; s++) assert.equal(["a", "b", "c", "d"][storedIndexAt(order, s)!], shown[s]);
    assert.equal(shown[shownIndexOf(order, 2)], "c");
  });

  test("storedIndexAt refuses anything but an in-range integer", () => {
    const order = presentationOrder("x", 4);
    for (const bad of [-1, 4, 1.5, "1", null, undefined]) assert.equal(storedIndexAt(order, bad), null);
  });
});

test("presentationSeed ignores the case of the ids (REQ-098)", () => {
  const u = "6F9619FF-8B86-D011-B42D-00C04FC964FF";
  const o = "A0EEBC99-9C0B-4EF8-BB6D-6BB9BD380A11";
  assert.equal(presentationSeed(u, o, "fade", "q"), presentationSeed(u.toLowerCase(), o.toLowerCase(), "fade", "q"));
});

test("lessonItemKey depends on stage and question", () => {
  assert.equal(lessonItemKey("solo", "q"), lessonItemKey("solo", "q"));
  assert.notEqual(lessonItemKey("solo", "q"), lessonItemKey("fade", "q"));
  assert.match(lessonItemKey("solo", "q"), /^[0-9a-f]{32}$/);
});
