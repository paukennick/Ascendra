// REQ-296 (clinical coverage): golden paths for NCLEXPN/first-dose-anaphylaxis.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps pn-anaph
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NCLEXPN", slug: "first-dose-anaphylaxis" };

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
        title: "Expert at study pace: look and listen, epinephrine, 911, RN, semi-sitting with legs up, oxygen, vital signs, allergy history, record and report",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 5);
          act(c, "look");
          act(c, "epi");
          act(c, "call911");
          act(c, "callRn");
          act(c, "position", { pos: "semi" });
          act(c, "oxygen");
          act(c, "monitor");
          act(c, "allergy");
          act(c, "note");
          toEnd(c);
        },
      },
      {
        id: "lateEpi",
        title: "Vital signs and allergy history first, epinephrine at 7 minutes and a second dose, 911 late",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          act(c, "look");
          act(c, "monitor");
          act(c, "allergy");
          act(c, "callRn");
          act(c, "position", { pos: "flat" });
          upTo(c, 420);
          act(c, "epi");
          act(c, "call911");
          upTo(c, 760);
          act(c, "epi");
          act(c, "note");
          toEnd(c);
        },
      },
      {
        id: "antihistFirst",
        title: "Diphenhydramine first, then epinephrine at 3 minutes and 911; left sitting in the chair",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          act(c, "look");
          act(c, "antihist");
          upTo(c, 180);
          act(c, "epi");
          act(c, "call911");
          act(c, "monitor");
          toEnd(c);
        },
      },
      {
        id: "walked",
        title: "Failure: walks her to the bathroom before anything else",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 30);
          act(c, "look");
          act(c, "bathroom");
          toEnd(c);
        },
      },
      {
        id: "waitedOut",
        title: "Failure: antihistamine and a call to the RN only; she collapses",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 30);
          act(c, "antihist");
          act(c, "callRn");
          toEnd(c);
        },
      },
    ],
  };
}
