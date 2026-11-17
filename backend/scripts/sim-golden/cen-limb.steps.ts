// REQ-326 (sims-health-4, docs/sims.md 22.34): golden paths for
// CEN/cold-leg-new-numbness. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps cen-limb
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CEN", slug: "cold-leg-new-numbness" };

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
        title: "Expert at study pace: heparin, leg dependent, Doppler, reassess; at the numbness vascular surgery now; hand-off",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "fix");
          act(c, "depend");
          test(c, "doppler");
          act(c, "reassess");
          untilRed(c);
          act(c, "diagnose", { dx: "ali" });
          act(c, "refer", { how: "vasc" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Treats well and finds the numbness, but calls more than 5 minutes later",
        reasoning: "partial",
        drive: (c) => {
          act(c, "fix");
          act(c, "depend");
          test(c, "doppler");
          act(c, "reassess");
          untilRed(c);
          upTo(c, c.run.state.tick + 78);
          act(c, "diagnose", { dx: "ali" });
          act(c, "refer", { how: "vasc" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "wrongRoute",
        title: "Failure: heparin and Doppler, then calls it a DVT and agrees to a clinic appointment",
        reasoning: "missed",
        drive: (c) => {
          act(c, "fix");
          test(c, "doppler");
          untilRed(c);
          act(c, "diagnose", { dx: "dvt" });
          act(c, "refer", { how: "clinic" });
          toEnd(c);
        },
      },
      {
        id: "unsafe",
        title: "Failure: checks for DVT, then raises the leg and warms the foot",
        reasoning: "missed",
        drive: (c) => {
          test(c, "dvt");
          act(c, "unsafe");
          toEnd(c);
        },
      },
      {
        id: "noAction",
        title: "Failure: DVT check, history and Doppler, calls it chronic PAD; no heparin and no call",
        reasoning: "missed",
        drive: (c) => {
          test(c, "dvt");
          test(c, "hx");
          test(c, "doppler");
          act(c, "diagnose", { dx: "pad" });
          toEnd(c);
        },
      },
    ],
  };
}
