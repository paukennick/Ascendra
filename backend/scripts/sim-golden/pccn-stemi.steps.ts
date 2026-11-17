// REQ-326 (sims-health-4, docs/sims.md 22.34): golden paths for
// PCCN/telemetry-st-rising-inferior-leads. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps pccn-stemi
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "PCCN", slug: "telemetry-st-rising-inferior-leads" };

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
        title: "Expert at study pace: protocol, pads, 12-lead with right-sided leads, reassess; at the ST alarm rapid response and cardiology now; hand-off",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "fix");
          act(c, "pads");
          test(c, "ecg");
          act(c, "reassess");
          untilRed(c);
          act(c, "diagnose", { dx: "stemi" });
          act(c, "refer", { how: "now" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Treats well and sees the ST elevation, but calls more than 5 minutes later",
        reasoning: "partial",
        drive: (c) => {
          act(c, "fix");
          act(c, "pads");
          test(c, "ecg");
          act(c, "reassess");
          untilRed(c);
          upTo(c, c.run.state.tick + 78);
          act(c, "diagnose", { dx: "stemi" });
          act(c, "refer", { how: "now" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "wrongRoute",
        title: "Failure: protocol and ECG, then reads the change as his known NSTEMI and leaves it for the morning",
        reasoning: "missed",
        drive: (c) => {
          act(c, "fix");
          test(c, "ecg");
          untilRed(c);
          act(c, "diagnose", { dx: "nstemi" });
          act(c, "refer", { how: "morning" });
          toEnd(c);
        },
      },
      {
        id: "unsafe",
        title: "Failure: asks about the pain, then gives the nitroglycerin",
        reasoning: "missed",
        drive: (c) => {
          test(c, "hx");
          act(c, "unsafe");
          toEnd(c);
        },
      },
      {
        id: "noAction",
        title: "Failure: history, troponin and ECG, calls it stable angina; no protocol and no call",
        reasoning: "missed",
        drive: (c) => {
          test(c, "hx");
          test(c, "trop");
          test(c, "ecg");
          act(c, "diagnose", { dx: "angina" });
          toEnd(c);
        },
      },
    ],
  };
}
