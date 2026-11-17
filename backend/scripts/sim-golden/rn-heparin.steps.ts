// REQ-325 (nursing depth, round 3): golden paths for
// NCLEXRN/heparin-aptt-high-pink-urine. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps rn-heparin
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NCLEXRN", slug: "heparin-aptt-high-pink-urine" };

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
        title: "Expert at study pace: aPTT read; heparin stopped; bleeding check; pump checked and double-checked; over-anticoagulated; provider; documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "aptt");
          act(c, "stop");
          test(c, "bleed");
          test(c, "pump");
          act(c, "check");
          act(c, "diagnose", { dx: "over" });
          act(c, "refer", { how: "provider" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateStop",
        title: "Reads the blood count and checks for bleeding first, then stops the heparin more than 5 minutes after the aPTT",
        reasoning: "partial",
        drive: (c) => {
          test(c, "cbc");
          test(c, "bleed");
          test(c, "aptt");
          upTo(c, 100);
          act(c, "stop");
          test(c, "pump");
          act(c, "check");
          act(c, "diagnose", { dx: "over" });
          act(c, "refer", { how: "provider" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noPumpCheck",
        title: "Stops it and calls at once, but never checks the pump, so the programming error goes unfound",
        reasoning: "partial",
        drive: (c) => {
          test(c, "aptt");
          act(c, "stop");
          test(c, "bleed");
          act(c, "refer", { how: "provider" });
          act(c, "diagnose", { dx: "over" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "turnedUp",
        title: "Failure: reads a high aPTT as clotting, increases the rate and waits for the next draw",
        reasoning: "missed",
        drive: (c) => {
          test(c, "aptt");
          act(c, "diagnose", { dx: "under" });
          act(c, "up");
          act(c, "refer", { how: "recheck" });
          toEnd(c);
        },
      },
      {
        id: "nearTarget",
        title: "Failure: calls the result close enough and waits 6 hours",
        reasoning: "missed",
        drive: (c) => {
          test(c, "aptt");
          act(c, "diagnose", { dx: "ok" });
          act(c, "refer", { how: "recheck" });
          toEnd(c);
        },
      },
    ],
  };
}
