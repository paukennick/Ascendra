// REQ-326 (sims-health-4, docs/sims.md 22.34): golden paths for
// CMSRN/found-on-floor-on-anticoagulant. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps cmsrn-fall
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CMSRN", slug: "found-on-floor-on-anticoagulant" };

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
        title: "Expert at study pace: injury check before moving, room risks fixed, neuro check, reassess; at the drop the provider now; hand-off",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "fix");
          act(c, "prec");
          test(c, "neuro");
          act(c, "reassess");
          untilRed(c);
          act(c, "diagnose", { dx: "ich" });
          act(c, "refer", { how: "now" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Checks well and sees the drop, but calls more than 5 minutes later",
        reasoning: "partial",
        drive: (c) => {
          act(c, "fix");
          act(c, "prec");
          test(c, "neuro");
          act(c, "reassess");
          untilRed(c);
          upTo(c, c.run.state.tick + 78);
          act(c, "diagnose", { dx: "ich" });
          act(c, "refer", { how: "now" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "wrongRoute",
        title: "Failure: injury check and a neuro check, then reads drowsiness as sleep and leaves it for the day team",
        reasoning: "missed",
        drive: (c) => {
          act(c, "fix");
          test(c, "neuro");
          untilRed(c);
          act(c, "diagnose", { dx: "sleepy" });
          act(c, "refer", { how: "report" });
          toEnd(c);
        },
      },
      {
        id: "unsafe",
        title: "Failure: checks the head, then gives the as-needed sedative",
        reasoning: "missed",
        drive: (c) => {
          test(c, "head");
          act(c, "unsafe");
          toEnd(c);
        },
      },
      {
        id: "noAction",
        title: "Failure: head, room and neuro checks, puts the confusion down to pneumonia; no injury check before moving and no call",
        reasoning: "missed",
        drive: (c) => {
          test(c, "head");
          test(c, "env");
          test(c, "neuro");
          act(c, "diagnose", { dx: "pneumonia" });
          toEnd(c);
        },
      },
    ],
  };
}
