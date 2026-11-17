// REQ-312: golden paths for the JAVASCRIPT type coercion case on the data
// and code console (JAVASCRIPT/js-checkout-shipping-concatenated.sim.json).
import type { StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "JAVASCRIPT", slug: "js-checkout-shipping-concatenated" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "typeof first; audit yesterday's orders; Number() at the boundary with a NaN check; three cases pass; deploy before the sale",
        reasoning: "met",
        drive: (c) => {
          run(c, "typeofStep");
          run(c, "audit");
          run(c, "fixNumber");
          run(c, "test");
          run(c, "ship");
          record(c, { cause: "concat", check: "cases" });
        },
      },
      {
        id: "parseIntUntested",
        title: "Switches to parseInt without looking and deploys untested",
        reasoning: "missed",
        drive: (c) => {
          run(c, "fixParseInt");
          run(c, "ship");
          record(c, { cause: "rounding", check: "manual" });
        },
      },
      {
        id: "unaryPlus",
        title: "Checks the types, wraps the total in unary plus, sees NaN in the test, and deploys anyway",
        reasoning: "partial",
        drive: (c) => {
          run(c, "typeofStep");
          run(c, "fixPlus");
          run(c, "test");
          run(c, "ship");
          record(c, { cause: "concat", check: "none" });
        },
      },
      {
        id: "untestedRight",
        title: "Checks the types, fixes with Number(), and deploys without running the tests",
        reasoning: "met",
        drive: (c) => {
          run(c, "typeofStep");
          run(c, "fixNumber");
          run(c, "ship");
          record(c, { cause: "concat", check: "manual" });
        },
      },
      {
        id: "late",
        title: "Fixes first, then checks types and audits, tests, waits, and deploys after 18:00",
        reasoning: "met",
        drive: (c) => {
          run(c, "fixNumber");
          run(c, "typeofStep");
          run(c, "audit");
          run(c, "test");
          for (let i = 0; i < 3; i++) run(c, "wait");
          run(c, "ship");
          record(c, { cause: "concat", check: "cases" });
        },
      },
      {
        id: "holdBack",
        title: "Finds the cause and the damage, and deploys nothing",
        reasoning: "partial",
        drive: (c) => {
          run(c, "typeofStep");
          run(c, "audit");
          record(c, { cause: "concat", check: "none" });
        },
      },
    ],
  };
}
