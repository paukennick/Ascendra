// REQ-326 (sims-health-4, docs/sims.md 22.34): golden paths for
// CEN/bike-crash-breath-sounds-gone. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps cen-tension
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CEN", slug: "bike-crash-breath-sounds-gone" };

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
        title: "Expert at study pace: oxygen and access, kit open, chest assessed, reassess; at the signs of tension the physician now; hand-off",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "fix");
          act(c, "kit");
          test(c, "chest");
          act(c, "reassess");
          untilRed(c);
          act(c, "diagnose", { dx: "tension" });
          act(c, "refer", { how: "now" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Treats well and sees the signs, but calls more than 5 minutes later",
        reasoning: "partial",
        drive: (c) => {
          act(c, "fix");
          act(c, "kit");
          test(c, "chest");
          act(c, "reassess");
          untilRed(c);
          upTo(c, c.run.state.tick + 78);
          act(c, "diagnose", { dx: "tension" });
          act(c, "refer", { how: "now" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "wrongRoute",
        title: "Failure: oxygen and the chest exam, then calls it a contusion and waits for the film",
        reasoning: "missed",
        drive: (c) => {
          act(c, "fix");
          test(c, "chest");
          untilRed(c);
          act(c, "diagnose", { dx: "ribs" });
          act(c, "refer", { how: "film" });
          toEnd(c);
        },
      },
      {
        id: "unsafe",
        title: "Failure: asks the history, then takes him to radiology to confirm",
        reasoning: "missed",
        drive: (c) => {
          test(c, "hx");
          act(c, "unsafe");
          toEnd(c);
        },
      },
      {
        id: "noAction",
        title: "Failure: history, chest wall and chest exam, calls it rib pain; no oxygen and no call",
        reasoning: "missed",
        drive: (c) => {
          test(c, "hx");
          test(c, "skin");
          test(c, "chest");
          act(c, "diagnose", { dx: "contusion" });
          toEnd(c);
        },
      },
    ],
  };
}
