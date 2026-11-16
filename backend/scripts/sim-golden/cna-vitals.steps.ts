// REQ-296 (clinical coverage): golden paths for CNA/evening-vitals-out-of-range.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps cna-vitals
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CNA", slug: "evening-vitals-out-of-range" };

const GOOD = { obs: "numbers", when: "now" };
const ended = (c: Ctl): boolean => c.run.state.ended !== null;
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || ended(x));
const toEnd = (c: Ctl): void => until(c, (x) => ended(x), 20000);
function act(c: Ctl, a: string, p?: Record<string, string>): void {
  if (ended(c)) return;
  c.act(a, p);
  teach(c);
}
function bp(c: Ctl, cuff: "small" | "large"): void {
  act(c, "bp", { cuff });
  until(c, (x) => x.value("bpPending") === false || ended(x));
}
function pulse(c: Ctl, how: "full" | "half"): void {
  act(c, "pulse", { how });
  until(c, (x) => x.value("pPending") === false || ended(x));
}
function temp(c: Ctl): void {
  act(c, "temp");
  until(c, (x) => x.value("tPending") === false || ended(x));
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: look and ask, small cuff, full-minute pulse, findings to the nurse at once, commode with her, temperature after 15 minutes, objective note",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 5);
          act(c, "look");
          act(c, "ask");
          bp(c, "small");
          pulse(c, "full");
          act(c, "resp");
          act(c, "report", GOOD);
          act(c, "commode");
          upTo(c, 620);
          temp(c);
          act(c, "note", { kind: "obj" });
          toEnd(c);
        },
      },
      {
        id: "guessFirst",
        title: "Right technique, but tells the nurse a guess at a diagnosis; she comes after the med pass; commode when asked",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 30);
          bp(c, "small");
          pulse(c, "full");
          act(c, "report", { obs: "guess", when: "now" });
          upTo(c, 500);
          act(c, "commode");
          upTo(c, 620);
          temp(c);
          act(c, "note", { kind: "opinion" });
          toEnd(c);
        },
      },
      {
        id: "wrongTechnique",
        title: "Large cuff, 30-second pulse, temperature right after tea; reports the numbers at once; resident walked to the bathroom early",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          act(c, "walk");
          bp(c, "large");
          pulse(c, "half");
          temp(c);
          act(c, "report", GOOD);
          act(c, "note", { kind: "obj" });
          toEnd(c);
        },
      },
      {
        id: "lateEmergency",
        title: "Plans to report at the end of the round; commode when asked; the emergency comes; call light and a shout from her side, lays her flat",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 60);
          bp(c, "small");
          pulse(c, "full");
          act(c, "report", { obs: "numbers", when: "later" });
          upTo(c, 490);
          act(c, "commode");
          until(c, (x) => x.value("emergAt") !== null || ended(x));
          act(c, "look");
          act(c, "callHelp");
          act(c, "layFlat");
          act(c, "note", { kind: "obj" });
          toEnd(c);
        },
      },
      {
        id: "leftAlone",
        title: "Failure: routine report and a recheck later; in the emergency, runs to find the nurse and she falls",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 60);
          bp(c, "small");
          pulse(c, "half");
          act(c, "report", { obs: "routine", when: "now" });
          act(c, "recheckLater");
          upTo(c, 490);
          act(c, "commode");
          until(c, (x) => x.value("emergAt") !== null || ended(x));
          act(c, "look");
          act(c, "leaveForNurse");
          toEnd(c);
        },
      },
      {
        id: "unattended",
        title: "Failure: only a temperature, nobody told, she gets up alone",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 120);
          temp(c);
          act(c, "recheckLater");
          toEnd(c);
        },
      },
      {
        id: "shockInBed",
        title: "Failure: commode and lying flat, but no report and no call for help; she collapses in bed",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 60);
          act(c, "commode");
          act(c, "layFlat");
          bp(c, "small");
          pulse(c, "full");
          act(c, "recheckLater");
          toEnd(c);
        },
      },
    ],
  };
}
