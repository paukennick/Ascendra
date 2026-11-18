// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// CCRNNEO/green-vomit-day-three. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps neo-volvulus
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNNEO", slug: "green-vomit-day-three" };

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
        title: "Expert at study pace: sees the bile, NPO and OG tube, calls for the surgeon at once, examines, tells the parents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "emesis");
          act(c, "npo");
          act(c, "ogt");
          act(c, "diagnose", { dx: "volvulus" });
          act(c, "refer", { how: "call" });
          test(c, "abdomen");
          test(c, "perfusion");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Sees the bile and decompresses, but reads the chart and waits 8 minutes before calling",
        reasoning: "partial",
        drive: (c) => {
          test(c, "emesis");
          act(c, "npo");
          act(c, "ogt");
          test(c, "history");
          test(c, "abdomen");
          test(c, "perfusion");
          upTo(c, 130);
          act(c, "diagnose", { dx: "volvulus" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "refed",
        title: "Calls promptly but tries a smaller feed first and never places the tube",
        reasoning: "partial",
        drive: (c) => {
          test(c, "emesis");
          act(c, "refeed");
          act(c, "npo");
          act(c, "diagnose", { dx: "volvulus" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "reflux",
        title: "Failure: reads it as reflux, positions him upright and leaves it for rounds",
        reasoning: "missed",
        drive: (c) => {
          test(c, "emesis");
          act(c, "diagnose", { dx: "reflux" });
          act(c, "reflux");
          act(c, "refer", { how: "rounds" });
          toEnd(c);
        },
      },
      {
        id: "formula",
        title: "Failure: calls it formula intolerance and refeeds",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "formula" });
          act(c, "refeed");
          test(c, "history");
          toEnd(c);
        },
      },
    ],
  };
}
