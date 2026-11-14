// REQ-262: the Explain first / Example first test's pure rules, the lesson
// event detail that carries it, and the results query kept identical to the
// doc. The store and the route run against a real Postgres in
// lib/teach-order.dbtest.ts.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomInt } from "node:crypto";
import { armFor, DEFAULT_TEACH_ORDER, isTeachOrder, isTeachOrderSource, teachOrderTestOn, TEACH_ORDERS } from "./teach-order-rules";
import { lessonEventDetail } from "./learner-level-rules";
import { formatTeachOrderResults, TEACH_ORDER_RESULTS_SQL } from "./teach-order-results";

describe("the two orders", () => {
  test("exactly two, Explain first is the default", () => {
    assert.deepEqual([...TEACH_ORDERS], ["explain_first", "example_first"]);
    assert.equal(DEFAULT_TEACH_ORDER, "explain_first");
  });
  test("only the two values are orders", () => {
    assert.ok(isTeachOrder("example_first"));
    for (const v of ["Explain first", "", null, undefined, 1, {}, "example_first "]) assert.equal(isTeachOrder(v), false);
    assert.ok(isTeachOrderSource("default") && isTeachOrderSource("chosen") && isTeachOrderSource("assigned"));
    assert.equal(isTeachOrderSource("random"), false);
  });
  test("a fair coin gives both arms about equally", () => {
    const n = 4000;
    let example = 0;
    for (let i = 0; i < n; i++) if (armFor(randomInt(2)) === "example_first") example++;
    assert.ok(example > n * 0.45 && example < n * 0.55, `example_first ${example} of ${n}`);
    assert.equal(armFor(0), "explain_first");
    assert.equal(armFor(1), "example_first");
  });
});

describe("the test is on unless set off", () => {
  test("unset, empty and odd values leave it on", () => {
    for (const v of [undefined, "", "on", "yes", "1", "true", "garbage"]) assert.equal(teachOrderTestOn(v), true, String(v));
  });
  test("off, 0 and false (any case, padded) turn it off", () => {
    for (const v of ["off", "OFF", " Off ", "0", "false", "False"]) assert.equal(teachOrderTestOn(v), false, v);
  });
});

describe("lesson events carry the order only with its source", () => {
  test("both are kept when valid", () => {
    assert.deepEqual(lessonEventDetail({ order: "example_first", order_source: "assigned", level: "new" }), {
      level: "new",
      order: "example_first",
      order_source: "assigned",
    });
    assert.deepEqual(lessonEventDetail({ order: "explain_first", order_source: "chosen" }), { order: "explain_first", order_source: "chosen" });
  });
  test("an order without a valid source, or a source without an order, is dropped", () => {
    assert.deepEqual(lessonEventDetail({ order: "example_first" }), {});
    assert.deepEqual(lessonEventDetail({ order: "example_first", order_source: "default" }), {});
    assert.deepEqual(lessonEventDetail({ order: "example_first", order_source: "random" }), {});
    assert.deepEqual(lessonEventDetail({ order_source: "chosen" }), {});
    assert.deepEqual(lessonEventDetail({ order: "sideways", order_source: "chosen" }), {});
  });
});

describe("the results query", () => {
  test("is read-only and never reads learner text", () => {
    assert.doesNotMatch(TEACH_ORDER_RESULTS_SQL, /\b(insert|update|delete|alter|drop|create|truncate)\b/i);
    assert.doesNotMatch(TEACH_ORDER_RESULTS_SQL, /\b(a\.answer|a\.question|a\.feedback|email)\b/i);
  });
  test("the doc carries the same query", () => {
    const doc = readFileSync(join(__dirname, "../../docs/teach-order-test.md"), "utf8");
    const m = /<!-- teach-order-sql -->\s*```sql\n([\s\S]*?)```/.exec(doc);
    assert.ok(m, "docs/teach-order-test.md has the query after the teach-order-sql marker");
    const norm = (s: string) => s.replace(/\s+/g, " ").trim();
    assert.equal(norm(m![1]), norm(TEACH_ORDER_RESULTS_SQL));
  });
  test("the doc names the four measures", () => {
    const doc = readFileSync(join(__dirname, "../../docs/teach-order-test.md"), "utf8");
    for (const w of ["first-try accuracy", "solo accuracy", "Independent mastery after 24h", "time in Teach"]) {
      assert.match(doc, new RegExp(w, "i"), w);
    }
  });
  test("the printout shows counts with every rate and copes with none", () => {
    assert.match(formatTeachOrderResults([], 30), /No lessons with an order/);
    const out = formatTeachOrderResults(
      [
        {
          arm: "example_first", source: "assigned", assignedOrder: "example_first", lessons: 10, learners: 4,
          guidedAnswered: 8, guidedFirstTryCorrect: 6, soloAnswered: 0, soloFirstTryCorrect: 0, soloUnassistedCorrect: 0,
          settled24h: 5, independentAfter24h: 1, medianTeachSeconds: null,
        },
      ],
      30
    );
    assert.match(out, /guided first try 75% \(6\/8\)/);
    assert.match(out, /solo first try n\/a \(0\)/);
    assert.match(out, /Independent after 24h 20% \(1\/5\)/);
    assert.match(out, /median time in Teach n\/a/);
  });
});
