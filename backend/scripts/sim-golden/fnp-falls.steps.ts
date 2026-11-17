// REQ-326 (sims-health-4, docs/sims.md 22.34): golden paths for
// FNPAANP/clinic-three-falls-five-new-pills. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps fnp-falls
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "FNPAANP", slug: "clinic-three-falls-five-new-pills" };

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
// Wait for the red flag (0.5 on the authored course), then reassess to find it.
function untilRed(c: Ctl): void {
  until(c, (x) => (x.value("prog") as number) >= 0.5 || ended(x));
  act(c, "reassess");
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: help with standing, Timed Up and Go, orthostatic pressures; the plan the same visit; documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "fix");
          act(c, "tug");
          test(c, "ortho");
          act(c, "reassess");
          act(c, "reassess");
          act(c, "diagnose", { dx: "poly" });
          act(c, "refer", { how: "plan" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Assesses well, but makes the plan more than 5 minutes after the orthostatic finding",
        reasoning: "partial",
        drive: (c) => {
          act(c, "fix");
          act(c, "tug");
          test(c, "ortho");
          act(c, "reassess");
          act(c, "reassess");
          upTo(c, c.run.state.tick + 78);
          act(c, "diagnose", { dx: "poly" });
          act(c, "refer", { how: "plan" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "wrongRoute",
        title: "Failure: helps her and measures the pressures, then calls it ageing and suggests a falls diary",
        reasoning: "missed",
        drive: (c) => {
          act(c, "fix");
          test(c, "ortho");
          act(c, "reassess");
          act(c, "diagnose", { dx: "age" });
          act(c, "refer", { how: "later" });
          toEnd(c);
        },
      },
      {
        id: "unsafe",
        title: "Failure: a cognitive screen, then a sleeping pill",
        reasoning: "missed",
        drive: (c) => {
          test(c, "cog");
          act(c, "unsafe");
          toEnd(c);
        },
      },
      {
        id: "noAction",
        title: "Failure: cognition, hip and pressures, orders a hip x-ray only; no help standing and no plan",
        reasoning: "missed",
        drive: (c) => {
          test(c, "cog");
          test(c, "hip");
          test(c, "ortho");
          act(c, "diagnose", { dx: "hip" });
          toEnd(c);
        },
      },
    ],
  };
}
