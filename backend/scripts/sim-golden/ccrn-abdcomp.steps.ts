// REQ-325 (nursing depth, round 3): golden paths for
// CCRNADULT/tight-belly-after-massive-resuscitation. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ccrn-abdcomp
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNADULT", slug: "tight-belly-after-massive-resuscitation" };

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
        title: "Expert at study pace: bladder pressure by protocol; NG to suction; abdominal compartment syndrome; surgeon now; blocker; documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "iapCheck");
          act(c, "ng");
          act(c, "diagnose", { dx: "acs" });
          act(c, "refer", { how: "surg" });
          upTo(c, 65);
          act(c, "nmb");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Examines and reviews organs first, measures, then tells the surgeon 6 minutes after the pressure",
        reasoning: "partial",
        drive: (c) => {
          test(c, "exam");
          test(c, "organs");
          test(c, "iapCheck");
          act(c, "ng");
          act(c, "diagnose", { dx: "acs" });
          upTo(c, 110);
          act(c, "refer", { how: "surg" });
          upTo(c, 165);
          act(c, "nmb");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "bolusFirst",
        title: "Measures and calls fast, but gives a fluid bolus for the low urine first",
        reasoning: "partial",
        drive: (c) => {
          test(c, "organs");
          test(c, "iapCheck");
          act(c, "bolus");
          act(c, "refer", { how: "surg" });
          act(c, "diagnose", { dx: "acs" });
          act(c, "ng");
          upTo(c, 85);
          act(c, "nmb");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "headUp",
        title: "Failure: takes an invalid head-up reading, calls him dry, gives a bolus and repeats in 4 hours",
        reasoning: "missed",
        drive: (c) => {
          test(c, "quick");
          act(c, "diagnose", { dx: "dry" });
          act(c, "bolus");
          act(c, "refer", { how: "repeat" });
          toEnd(c);
        },
      },
      {
        id: "feltIt",
        title: "Failure: feels the abdomen, calls it ARDS and never measures",
        reasoning: "missed",
        drive: (c) => {
          test(c, "exam");
          act(c, "diagnose", { dx: "ards" });
          toEnd(c);
        },
      },
    ],
  };
}
