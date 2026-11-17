// REQ-315: golden paths for NCLEXRN/alcohol-withdrawal-ciwa. No prototype
// exists, so the expectations are the engine's own results, re-checked by
// every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps rn-ciwa
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NCLEXRN", slug: "alcohol-withdrawal-ciwa" };

const ended = (c: Ctl): boolean => c.run.state.ended !== null;
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || ended(x));
const toEnd = (c: Ctl): void => until(c, (x) => ended(x), 20000);
function act(c: Ctl, a: string, p?: Record<string, string>): void {
  if (ended(c)) return;
  c.act(a, p);
  c.answer();
  teach(c);
}
// Score and wait for the result.
function score(c: Ctl): void {
  act(c, "ciwa");
  until(c, (x) => x.value("scoring") === false || ended(x));
  teach(c);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: history, vital signs, precautions, CIWA-Ar 14, lorazepam, thiamine, SBAR with the history, rescore at the hour",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 5);
          act(c, "history");
          act(c, "vitals");
          act(c, "precautions");
          score(c);
          act(c, "lorazepam");
          act(c, "thiamine");
          act(c, "callProvider");
          upTo(c, 3960);
          score(c);
          toEnd(c);
        },
      },
      {
        id: "noHistory",
        title: "Scores and treats by the protocol with precautions and thiamine, rescores at the hour, but never asks about drinking and calls without the history",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          act(c, "vitals");
          score(c);
          act(c, "lorazepam");
          act(c, "precautions");
          act(c, "thiamine");
          act(c, "callProvider");
          upTo(c, 3960);
          score(c);
          toEnd(c);
        },
      },
      {
        id: "doseFirst",
        title: "Lorazepam before any score, then history and a score, thiamine; never rescored",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          act(c, "lorazepam");
          act(c, "history");
          score(c);
          act(c, "thiamine");
          toEnd(c);
        },
      },
      {
        id: "lateRescore",
        title: "History, score and dose on time, but no thiamine or precautions, no call, and the rescore at 1 h 45 min",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          act(c, "history");
          score(c);
          act(c, "lorazepam");
          upTo(c, 6600);
          score(c);
          toEnd(c);
        },
      },
      {
        id: "restrained",
        title: "Failure: restrains him and waits for the provider's morning round; a seizure",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 30);
          act(c, "vitals");
          act(c, "restrain");
          toEnd(c);
        },
      },
      {
        id: "stacked",
        title: "Failure: three doses in a row to settle him, no score; oversedated",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 30);
          act(c, "lorazepam");
          upTo(c, 200);
          act(c, "lorazepam");
          upTo(c, 400);
          act(c, "lorazepam");
          toEnd(c);
        },
      },
    ],
  };
}
