// REQ-323 (health depth, round 2): golden paths for
// CCRNADULT/falling-platelets-cold-foot-on-heparin. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ccrn-hit
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNADULT", slug: "falling-platelets-cold-foot-on-heparin" };

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
        title: "Expert at study pace: platelets and both legs; infusion, flushes and lock stopped; 4Ts high; intensivist; non-heparin anticoagulant; heparin alert; documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "labs");
          test(c, "foot");
          act(c, "stopHep");
          act(c, "stopFlush");
          act(c, "diagnose", { dx: "hit" });
          act(c, "refer", { how: "icu" });
          upTo(c, 88);
          act(c, "anticoag");
          act(c, "flag");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "flushesMissed",
        title: "Stops the infusion and calls at once, but the arterial flush and lock keep giving heparin",
        reasoning: "partial",
        drive: (c) => {
          test(c, "labs");
          test(c, "foot");
          act(c, "stopHep");
          act(c, "diagnose", { dx: "hit" });
          act(c, "refer", { how: "icu" });
          upTo(c, 88);
          act(c, "anticoag");
          act(c, "flag");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateStop",
        title: "Looks for other causes first and stops the heparin 6 minutes after the result; no heparin alert",
        reasoning: "partial",
        drive: (c) => {
          test(c, "other");
          test(c, "labs");
          test(c, "foot");
          upTo(c, 100);
          act(c, "stopHep");
          act(c, "stopFlush");
          act(c, "diagnose", { dx: "hit" });
          act(c, "refer", { how: "icu" });
          upTo(c, 164);
          act(c, "anticoag");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "transfuse",
        title: "Failure: reads the platelets, calls it ITP, transfuses platelets and leaves it for rounds",
        reasoning: "missed",
        drive: (c) => {
          test(c, "labs");
          act(c, "diagnose", { dx: "itp" });
          act(c, "platelets");
          act(c, "refer", { how: "morning" });
          toEnd(c);
        },
      },
      {
        id: "warfarinStart",
        title: "Failure: scores the 4Ts low, keeps the heparin and gives the warfarin from the night plan",
        reasoning: "missed",
        drive: (c) => {
          test(c, "labs");
          act(c, "diagnose", { dx: "dilution" });
          act(c, "warfarin");
          toEnd(c);
        },
      },
    ],
  };
}
