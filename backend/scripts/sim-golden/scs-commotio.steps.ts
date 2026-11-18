// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSSCS/lacrosse-ball-to-chest-collapse. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps scs-commotio
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSSCS", slug: "lacrosse-ball-to-chest-collapse" };

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
        title: "Expert at study pace: checks, calls 911, sends for the AED, compressions, shock, asks the mechanism, hands over",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "look");
          act(c, "refer", { how: "ems" });
          act(c, "aed");
          act(c, "cpr");
          act(c, "diagnose", { dx: "vf" });
          upTo(c, 30);
          act(c, "shock");
          test(c, "spine");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "late911",
        title: "Starts CPR and gets the AED, but calls 911 4 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "look");
          act(c, "cpr");
          act(c, "aed");
          test(c, "spine");
          upTo(c, 30);
          act(c, "shock");
          upTo(c, 60);
          act(c, "diagnose", { dx: "vf" });
          act(c, "refer", { how: "ems" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "pads",
        title: "Calls 911 and starts CPR, but strips his pads before the AED and never shocks",
        reasoning: "partial",
        drive: (c) => {
          test(c, "look");
          act(c, "refer", { how: "ems" });
          act(c, "cpr");
          act(c, "pads");
          act(c, "diagnose", { dx: "vf" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "winded",
        title: "Failure: thinks he is winded, puts him on his side and calls his parents",
        reasoning: "missed",
        drive: (c) => {
          test(c, "look");
          act(c, "diagnose", { dx: "wind" });
          act(c, "wait");
          act(c, "refer", { how: "parents" });
          toEnd(c);
        },
      },
      {
        id: "faint",
        title: "Failure: calls it a faint and waits",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "faint" });
          act(c, "wait");
          toEnd(c);
        },
      },
    ],
  };
}
