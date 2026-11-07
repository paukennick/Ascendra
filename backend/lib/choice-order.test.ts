// REQ-097: per-learner shuffle of lesson choices.
process.env.AUTH_JWT_SECRET ??= "choice-order-test-secret";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  choiceOrderKey,
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

// FAIL-116: the seed used to be the ids themselves, all of which the app can
// see, so anyone could recompute a learner's shuffle.
describe("presentationSeed", () => {
  const ids = ["user-1", "obj-1", "fade", "Which port does HTTPS use?"] as const;

  test("is not computable from the ids alone", () => {
    const seed = presentationSeed(...ids);
    assert.doesNotMatch(seed, /user-1|obj-1|HTTPS/);
    assert.notEqual(seed, ids.join("\n"));
    assert.notEqual(seed, createHash("sha256").update(ids.join("\n")).digest("hex"));
    assert.match(seed, /^[0-9a-f]{64}$/);
  });

  test("depends on the server secret, and is stable for the same secret and item", () => {
    const saved = { own: process.env.CHOICE_ORDER_SECRET, jwt: process.env.AUTH_JWT_SECRET };
    try {
      delete process.env.CHOICE_ORDER_SECRET;
      process.env.AUTH_JWT_SECRET = "secret-a";
      const a = presentationSeed(...ids);
      assert.equal(presentationSeed(...ids), a, "stable");
      process.env.AUTH_JWT_SECRET = "secret-b";
      const b = presentationSeed(...ids);
      assert.notEqual(b, a, "a different JWT secret gives a different seed");
      process.env.CHOICE_ORDER_SECRET = "own-secret";
      const c = presentationSeed(...ids);
      assert.notEqual(c, b, "CHOICE_ORDER_SECRET takes precedence");
      process.env.AUTH_JWT_SECRET = "secret-a";
      assert.equal(presentationSeed(...ids), c, "and the JWT secret no longer matters then");
      // Different learner, objective, stage or question: different seed.
      assert.notEqual(presentationSeed("user-2", ids[1], ids[2], ids[3]), c);
      assert.notEqual(presentationSeed(ids[0], ids[1], "solo", ids[3]), c);
    } finally {
      if (saved.own === undefined) delete process.env.CHOICE_ORDER_SECRET;
      else process.env.CHOICE_ORDER_SECRET = saved.own;
      process.env.AUTH_JWT_SECRET = saved.jwt;
    }
  });

  test("the derived key is not the JWT secret itself, and no secret at all is refused", () => {
    assert.notDeepEqual(choiceOrderKey({ AUTH_JWT_SECRET: "s" }), Buffer.from("s"));
    assert.equal(choiceOrderKey({ AUTH_JWT_SECRET: "s" }).length, 32);
    assert.throws(() => choiceOrderKey({}), /CHOICE_ORDER_SECRET or AUTH_JWT_SECRET/);
  });
});

test("lessonItemKey depends on stage and question", () => {
  assert.equal(lessonItemKey("solo", "q"), lessonItemKey("solo", "q"));
  assert.notEqual(lessonItemKey("solo", "q"), lessonItemKey("fade", "q"));
  assert.match(lessonItemKey("solo", "q"), /^[0-9a-f]{32}$/);
});
