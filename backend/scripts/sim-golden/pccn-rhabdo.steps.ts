// REQ-326 (sims-health-4, docs/sims.md 22.34): golden paths for
// PCCN/found-down-dark-urine. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps pccn-rhabdo
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "PCCN", slug: "found-down-dark-urine" };

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
        title: "Expert at study pace: high-rate fluid, supplements held, labs, reassess; at falling urine and peaked T waves the provider now; hand-off",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "fix");
          act(c, "hold");
          test(c, "labs");
          act(c, "reassess");
          untilRed(c);
          act(c, "diagnose", { dx: "rhabdo" });
          act(c, "refer", { how: "now" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Treats well and sees the warning signs, but calls more than 5 minutes later",
        reasoning: "partial",
        drive: (c) => {
          act(c, "fix");
          act(c, "hold");
          test(c, "labs");
          act(c, "reassess");
          untilRed(c);
          upTo(c, c.run.state.tick + 78);
          act(c, "diagnose", { dx: "rhabdo" });
          act(c, "refer", { how: "now" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "wrongRoute",
        title: "Failure: fluid and labs, then calls it dehydration and waits for the noon labs",
        reasoning: "missed",
        drive: (c) => {
          act(c, "fix");
          test(c, "labs");
          untilRed(c);
          act(c, "diagnose", { dx: "dehyd" });
          act(c, "refer", { how: "later" });
          toEnd(c);
        },
      },
      {
        id: "unsafe",
        title: "Failure: checks the legs, then gives the potassium supplement",
        reasoning: "missed",
        drive: (c) => {
          test(c, "legs");
          act(c, "unsafe");
          toEnd(c);
        },
      },
      {
        id: "noAction",
        title: "Failure: legs, telemetry and labs, calls it infection; no fluid and no call",
        reasoning: "missed",
        drive: (c) => {
          test(c, "legs");
          test(c, "ecg");
          test(c, "labs");
          act(c, "diagnose", { dx: "uti" });
          toEnd(c);
        },
      },
    ],
  };
}
