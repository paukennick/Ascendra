// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// CCRNPEDS/toddler-woke-after-naloxone-now-sleepy. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps peds-opioid
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNPEDS", slug: "toddler-woke-after-naloxone-now-sleepy" };

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

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: rouses her, airway and repeat naloxone, calls, checks breathing, glucose and timeline, tells her mother",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "rouse");
          act(c, "bvm");
          act(c, "nalox");
          act(c, "diagnose", { dx: "recur" });
          act(c, "refer", { how: "call" });
          test(c, "resp");
          test(c, "glucose");
          test(c, "history");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Treats at once but works through the checks before calling 6 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "rouse");
          act(c, "bvm");
          act(c, "nalox");
          test(c, "resp");
          test(c, "glucose");
          test(c, "history");
          upTo(c, 85);
          act(c, "diagnose", { dx: "recur" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "alarms",
        title: "Calls promptly but widens the alarms and gives no repeat dose",
        reasoning: "partial",
        drive: (c) => {
          test(c, "rouse");
          act(c, "silence");
          act(c, "diagnose", { dx: "recur" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "tired",
        title: "Failure: thinks she is tired, lets her sleep and leaves it for rounds",
        reasoning: "missed",
        drive: (c) => {
          test(c, "rouse");
          act(c, "diagnose", { dx: "tired" });
          act(c, "sleep");
          act(c, "refer", { how: "morning" });
          toEnd(c);
        },
      },
      {
        id: "sugar",
        title: "Failure: blames her sugar and widens the alarms",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "sugar" });
          act(c, "silence");
          toEnd(c);
        },
      },
    ],
  };
}
