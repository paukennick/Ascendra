// REQ-326 (sims-health-4, docs/sims.md 22.34): golden paths for
// NPTEPTA/pta-treadmill-pressure-falls-with-grade. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps pta-bp
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NPTEPTA", slug: "pta-treadmill-pressure-falls-with-grade" };

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
        title: "Expert at study pace: resting vitals, defibrillator, stage check, reassess; at the drop stop and tell the PT; data in the note",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "aed");
          test(c, "stage");
          act(c, "reassess");
          untilRed(c);
          act(c, "fix");
          act(c, "diagnose", { dx: "data" });
          act(c, "refer", { how: "pt" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Stops at once, but tells the PT more than 5 minutes later",
        reasoning: "partial",
        drive: (c) => {
          act(c, "aed");
          test(c, "stage");
          act(c, "reassess");
          untilRed(c);
          act(c, "fix");
          upTo(c, c.run.state.tick + 78);
          act(c, "diagnose", { dx: "data" });
          act(c, "refer", { how: "pt" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "wrongRoute",
        title: "Failure: checks the stage and stops, then notes 'tolerated' and finishes at a lower grade",
        reasoning: "missed",
        drive: (c) => {
          test(c, "stage");
          untilRed(c);
          act(c, "fix");
          act(c, "diagnose", { dx: "fine" });
          act(c, "refer", { how: "note" });
          toEnd(c);
        },
      },
      {
        id: "unsafe",
        title: "Failure: checks in, then raises the grade",
        reasoning: "missed",
        drive: (c) => {
          test(c, "check");
          act(c, "unsafe");
          toEnd(c);
        },
      },
      {
        id: "noAction",
        title: "Failure: check-in, resting and stage vitals, notes 'tolerated well'; keeps going and tells no one",
        reasoning: "missed",
        drive: (c) => {
          test(c, "check");
          test(c, "rest");
          test(c, "stage");
          act(c, "diagnose", { dx: "dx" });
          toEnd(c);
        },
      },
    ],
  };
}
