// REQ-325 (nursing depth, round 3): golden paths for
// CCRNADULT/pressor-arm-cold-and-pale. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ccrn-extrav
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNADULT", slug: "pressor-arm-cold-and-pale" };

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
        title: "Expert at study pace: site check; stopped, aspirated, catheter left; restarted in the other arm; intensivist; elevated; phentolamine; documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "site");
          act(c, "stop");
          act(c, "asp");
          act(c, "restart");
          act(c, "diagnose", { dx: "extrav" });
          act(c, "refer", { how: "icu" });
          act(c, "elev");
          upTo(c, 65);
          act(c, "anti");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateStop",
        title: "Reviews the trend and the other IV first, then takes over a minute to stop the infusion after finding the site",
        reasoning: "partial",
        drive: (c) => {
          test(c, "trend");
          test(c, "other");
          test(c, "site");
          upTo(c, 52);
          act(c, "stop");
          act(c, "asp");
          act(c, "restart");
          act(c, "diagnose", { dx: "extrav" });
          act(c, "refer", { how: "icu" });
          act(c, "elev");
          upTo(c, 110);
          act(c, "anti");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "pulledOut",
        title: "Stops and restarts fast but pulls the catheter before the antidote",
        reasoning: "partial",
        drive: (c) => {
          test(c, "site");
          act(c, "stop");
          act(c, "pull");
          act(c, "restart");
          act(c, "refer", { how: "icu" });
          act(c, "diagnose", { dx: "extrav" });
          upTo(c, 65);
          act(c, "anti");
          act(c, "elev");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "leftOff",
        title: "Failure: stops the infiltrated infusion and calls, but never restarts the vasopressor anywhere",
        reasoning: "missed",
        drive: (c) => {
          test(c, "site");
          act(c, "stop");
          act(c, "diagnose", { dx: "extrav" });
          act(c, "asp");
          act(c, "elev");
          act(c, "refer", { how: "icu" });
          toEnd(c);
        },
      },
      {
        id: "turnedUp",
        title: "Failure: reads the falling MAP as worse shock, turns the rate up, flushes the line and leaves the arm for the line team",
        reasoning: "missed",
        drive: (c) => {
          test(c, "trend");
          act(c, "diagnose", { dx: "shock" });
          act(c, "rate");
          act(c, "flush");
          act(c, "refer", { how: "note" });
          toEnd(c);
        },
      },
    ],
  };
}
