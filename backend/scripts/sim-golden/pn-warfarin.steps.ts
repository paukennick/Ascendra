// REQ-325 (nursing depth, round 3): golden paths for
// NCLEXPN/warfarin-inr-high-tarry-stool. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps pn-warfarin
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NCLEXPN", slug: "warfarin-inr-high-tarry-stool" };

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
        title: "Expert at study pace: INR read; warfarin held; bleeding and vital signs; RN and provider now; steady vitamin K reinforced; documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "inr");
          act(c, "hold");
          test(c, "bleed");
          test(c, "vitals");
          act(c, "diagnose", { dx: "high" });
          act(c, "refer", { how: "report" });
          act(c, "teach");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateReport",
        title: "Asks about diet, checks bleeding and vital signs, then reads the INR and reports 6 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "diet");
          test(c, "bleed");
          test(c, "vitals");
          test(c, "inr");
          act(c, "hold");
          act(c, "diagnose", { dx: "high" });
          upTo(c, 120);
          act(c, "refer", { how: "report" });
          act(c, "teach");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "bigSalad",
        title: "Holds and reports at once, but tells the daughter to bring a big salad and never checks for bleeding",
        reasoning: "partial",
        drive: (c) => {
          test(c, "inr");
          act(c, "hold");
          act(c, "refer", { how: "report" });
          act(c, "diagnose", { dx: "high" });
          act(c, "greens");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "readBackwards",
        title: "Failure: reads a high INR as a clotting risk, gives the warfarin and leaves a note for the morning",
        reasoning: "missed",
        drive: (c) => {
          test(c, "inr");
          act(c, "diagnose", { dx: "low" });
          act(c, "dose");
          act(c, "refer", { how: "tomorrow" });
          toEnd(c);
        },
      },
      {
        id: "willSettle",
        title: "Failure: hears about her diet, decides it will settle and does nothing",
        reasoning: "missed",
        drive: (c) => {
          test(c, "diet");
          act(c, "diagnose", { dx: "fine" });
          toEnd(c);
        },
      },
    ],
  };
}
