// REQ-315: golden paths for NCLEXPN/head-strike-on-apixaban. No prototype
// exists, so the expectations are the engine's own results, re-checked by
// every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps pn-icp
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NCLEXPN", slug: "head-strike-on-apixaban" };

const ended = (c: Ctl): boolean => c.run.state.ended !== null;
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || ended(x));
const toEnd = (c: Ctl): void => until(c, (x) => ended(x), 20000);
function act(c: Ctl, a: string, p?: Record<string, string>): void {
  if (ended(c)) return;
  c.act(a, p);
  c.answer();
  teach(c);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: neuro check, vital signs, head up and on his side, SBAR to the RN with the data, 911",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 5);
          act(c, "neuro");
          act(c, "vitals");
          act(c, "airway");
          act(c, "callRn");
          act(c, "call911");
          upTo(c, 420);
          act(c, "neuro");
          toEnd(c);
        },
      },
      {
        id: "vagueReport",
        title: "Calls the RN first with no data, then the neuro check, airway and vital signs; the RN calls 911",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          act(c, "callRn");
          act(c, "neuro");
          act(c, "airway");
          act(c, "vitals");
          toEnd(c);
        },
      },
      {
        id: "painFirst",
        title: "Hydrocodone for the headache, head up and on his side, then neuro check, vital signs, RN and 911",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          act(c, "hydrocodone");
          act(c, "airway");
          upTo(c, 240);
          act(c, "neuro");
          act(c, "vitals");
          act(c, "callRn");
          act(c, "call911");
          toEnd(c);
        },
      },
      {
        id: "sleptFlat",
        title: "Failure: promethazine and the bed flat to sleep it off; he vomits on his back",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 30);
          act(c, "promethazine");
          act(c, "sleep");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Neuro check and airway at once, but waits 15 min to recheck before calling; herniation before the paramedics",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 10);
          act(c, "neuro");
          act(c, "airway");
          upTo(c, 900);
          act(c, "neuro");
          act(c, "vitals");
          act(c, "callRn");
          act(c, "call911");
          toEnd(c);
        },
      },
    ],
  };
}
