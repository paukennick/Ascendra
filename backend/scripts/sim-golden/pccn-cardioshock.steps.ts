// REQ-326 (sims-health-4, docs/sims.md 22.34): golden paths for
// PCCN/day-two-mi-cold-and-wet. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps pccn-cardioshock
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "PCCN", slug: "day-two-mi-cold-and-wet" };

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
        title: "Expert at study pace: sit up, oxygen, hourly urine, perfusion, reassess; at the shock criteria rapid response now; hand-off",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "fix");
          act(c, "uo");
          test(c, "perf");
          act(c, "reassess");
          untilRed(c);
          act(c, "diagnose", { dx: "cs" });
          act(c, "refer", { how: "rrt" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Treats well and sees the shock, but calls more than 5 minutes later",
        reasoning: "partial",
        drive: (c) => {
          act(c, "fix");
          act(c, "uo");
          test(c, "perf");
          act(c, "reassess");
          untilRed(c);
          upTo(c, c.run.state.tick + 78);
          act(c, "diagnose", { dx: "cs" });
          act(c, "refer", { how: "rrt" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "wrongRoute",
        title: "Failure: sits her up and checks perfusion, then reads it as dehydration and leaves it for the morning",
        reasoning: "missed",
        drive: (c) => {
          act(c, "fix");
          test(c, "perf");
          untilRed(c);
          act(c, "diagnose", { dx: "dry" });
          act(c, "refer", { how: "morning" });
          toEnd(c);
        },
      },
      {
        id: "unsafe",
        title: "Failure: listens to the chest, then runs a large fluid bolus",
        reasoning: "missed",
        drive: (c) => {
          test(c, "chest");
          act(c, "unsafe");
          toEnd(c);
        },
      },
      {
        id: "noAction",
        title: "Failure: chest, history and perfusion, calls it delirium; no positioning and no call",
        reasoning: "missed",
        drive: (c) => {
          test(c, "chest");
          test(c, "hx");
          test(c, "perf");
          act(c, "diagnose", { dx: "delirium" });
          toEnd(c);
        },
      },
    ],
  };
}
