// REQ-326 (sims-health-4, docs/sims.md 22.34): golden paths for
// CEN/house-fire-hoarse-voice. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps cen-inhal
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CEN", slug: "house-fire-hoarse-voice" };

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
        title: "Expert at study pace: oxygen and access, sat up, airway exam, reassess; at the stridor the physician and anesthesia now; hand-off",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "fix");
          act(c, "up");
          test(c, "airway");
          act(c, "reassess");
          untilRed(c);
          act(c, "diagnose", { dx: "airway" });
          act(c, "refer", { how: "airway" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Treats well and hears the stridor, but calls more than 5 minutes later",
        reasoning: "partial",
        drive: (c) => {
          act(c, "fix");
          act(c, "up");
          test(c, "airway");
          act(c, "reassess");
          untilRed(c);
          upTo(c, c.run.state.tick + 78);
          act(c, "diagnose", { dx: "airway" });
          act(c, "refer", { how: "airway" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "wrongRoute",
        title: "Failure: oxygen and an airway exam, then calls it anxiety and sends him to the burns ward",
        reasoning: "missed",
        drive: (c) => {
          act(c, "fix");
          test(c, "airway");
          untilRed(c);
          act(c, "diagnose", { dx: "anxiety" });
          act(c, "refer", { how: "ward" });
          toEnd(c);
        },
      },
      {
        id: "unsafe",
        title: "Failure: asks the history, then sends him to CT",
        reasoning: "missed",
        drive: (c) => {
          test(c, "hx");
          act(c, "unsafe");
          toEnd(c);
        },
      },
      {
        id: "noAction",
        title: "Failure: history, burn size and airway exam, calls it carbon monoxide only; no oxygen and no call",
        reasoning: "missed",
        drive: (c) => {
          test(c, "hx");
          test(c, "burns");
          test(c, "airway");
          act(c, "diagnose", { dx: "co" });
          toEnd(c);
        },
      },
    ],
  };
}
