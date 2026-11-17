// REQ-326 (sims-health-4, docs/sims.md 22.34): golden paths for
// CEN/missed-dialysis-weak-legs. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps cen-k
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CEN", slug: "missed-dialysis-weak-legs" };

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
        title: "Expert at study pace: monitor and IV, pads, 12-lead, reassess; at the widening QRS the physician now; hand-off",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "fix");
          act(c, "pads");
          test(c, "ecg");
          act(c, "reassess");
          untilRed(c);
          act(c, "diagnose", { dx: "hyperk" });
          act(c, "refer", { how: "now" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Monitors well and sees the change, but calls more than 5 minutes later",
        reasoning: "partial",
        drive: (c) => {
          act(c, "fix");
          act(c, "pads");
          test(c, "ecg");
          act(c, "reassess");
          untilRed(c);
          upTo(c, c.run.state.tick + 78);
          act(c, "diagnose", { dx: "hyperk" });
          act(c, "refer", { how: "now" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "wrongRoute",
        title: "Failure: monitored with a 12-lead, then calls it deconditioning and books dialysis for tomorrow",
        reasoning: "missed",
        drive: (c) => {
          act(c, "fix");
          test(c, "ecg");
          untilRed(c);
          act(c, "diagnose", { dx: "weak" });
          act(c, "refer", { how: "tomorrow" });
          toEnd(c);
        },
      },
      {
        id: "unsafe",
        title: "Failure: checks the potassium, then sends him off the monitor to radiology",
        reasoning: "missed",
        drive: (c) => {
          test(c, "kpoc");
          act(c, "unsafe");
          toEnd(c);
        },
      },
      {
        id: "noAction",
        title: "Failure: potassium, history and ECG, calls it a stroke; no monitor and no call",
        reasoning: "missed",
        drive: (c) => {
          test(c, "kpoc");
          test(c, "hx");
          test(c, "ecg");
          act(c, "diagnose", { dx: "stroke" });
          toEnd(c);
        },
      },
    ],
  };
}
