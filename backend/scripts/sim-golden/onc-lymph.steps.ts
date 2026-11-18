// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSONC/twenty-percent-smaller-by-a-different-tape. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps onc-lymph
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSONC", slug: "twenty-percent-smaller-by-a-different-tape" };

const ended = (c: Ctl): boolean => c.run.state.ended !== null;
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || ended(x));
const toEnd = (c: Ctl): void => until(c, (x) => ended(x), 20000);
function act(c: Ctl, a: string, p?: Record<string, string>): void {
  if (ended(c)) return;
  c.act(a, p);
  c.answer();
  teach(c);
}
function test(c: Ctl, a: string): void {
  act(c, a);
  until(c, (x) => x.value("testPending") === false || ended(x));
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: skin first, calls, method check, holds, remeasure and symptoms, documents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "skin");
          act(c, "diagnose", { dx: "both" });
          act(c, "refer", { how: "md" });
          test(c, "method");
          act(c, "hold");
          test(c, "remeas");
          test(c, "symp");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Method and hold right, but calls 8 minutes after the skin check",
        reasoning: "partial",
        drive: (c) => {
          test(c, "skin");
          test(c, "method");
          act(c, "hold");
          test(c, "remeas");
          test(c, "symp");
          upTo(c, 130);
          act(c, "diagnose", { dx: "both" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noMethod",
        title: "Calls and holds, but never checks the method",
        reasoning: "partial",
        drive: (c) => {
          test(c, "skin");
          act(c, "diagnose", { dx: "both" });
          act(c, "refer", { how: "md" });
          act(c, "hold");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "improved",
        title: "Failure: takes the 20% at face value and treats the arm",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "better" });
          act(c, "usual");
          act(c, "refer", { how: "next" });
          toEnd(c);
        },
      },
      {
        id: "flare",
        title: "Failure: sees the arm, calls it a flare, treats and discharges",
        reasoning: "missed",
        drive: (c) => {
          test(c, "skin");
          act(c, "diagnose", { dx: "flare" });
          act(c, "discharge");
          act(c, "usual");
          toEnd(c);
        },
      },
    ],
  };
}
