// REQ-325 (nursing depth, round 3): golden paths for
// NCLEXRN/pacu-snoring-then-vomiting. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps rn-pacu
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NCLEXRN", slug: "pacu-snoring-then-vomiting" };

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
        title: "Expert at study pace: airway assessed and opened; handover with anesthesia present; antiemetic; on her side to vomit; pain treated after; documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "airway");
          act(c, "jaw");
          test(c, "handover");
          act(c, "anti");
          act(c, "diagnose", { dx: "airway" });
          act(c, "refer", { how: "ok" });
          act(c, "side");
          test(c, "pain");
          act(c, "opioid");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateAirway",
        title: "Takes the handover and asks about pain first; opens the airway over a minute after finding the obstruction",
        reasoning: "partial",
        drive: (c) => {
          test(c, "handover");
          test(c, "pain");
          test(c, "airway");
          upTo(c, 52);
          act(c, "jaw");
          act(c, "anti");
          act(c, "side");
          act(c, "diagnose", { dx: "airway" });
          act(c, "refer", { how: "ok" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "opioidFirst",
        title: "Finds the obstruction but gives the opioid before opening the airway, and lets anesthesia leave",
        reasoning: "partial",
        drive: (c) => {
          test(c, "airway");
          act(c, "opioid");
          act(c, "jaw");
          act(c, "side");
          act(c, "anti");
          test(c, "handover");
          act(c, "diagnose", { dx: "airway" });
          act(c, "refer", { how: "none" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "painFirst",
        title: "Failure: puts pain first, gives the opioid into the obstructed airway and lets anesthesia leave",
        reasoning: "missed",
        drive: (c) => {
          test(c, "airway");
          act(c, "diagnose", { dx: "pain" });
          act(c, "opioid");
          toEnd(c);
        },
      },
      {
        id: "paperwork",
        title: "Failure: takes the handover, calls the snoring normal and does the paperwork",
        reasoning: "missed",
        drive: (c) => {
          test(c, "handover");
          act(c, "diagnose", { dx: "handoff" });
          toEnd(c);
        },
      },
    ],
  };
}
