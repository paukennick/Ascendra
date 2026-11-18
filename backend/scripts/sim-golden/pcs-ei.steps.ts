// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSPCS/he-used-to-say-ball. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps pcs-ei
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSPCS", slug: "he-used-to-say-ball" };

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
        title: "Expert at study pace: asks, watches, calls the pediatrician, connects to early intervention, documents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "loss");
          test(c, "obs");
          act(c, "diagnose", { dx: "red" });
          act(c, "refer", { how: "ped" });
          act(c, "ei");
          test(c, "motor");
          test(c, "fam");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Asks and connects, but calls 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "loss");
          test(c, "obs");
          act(c, "ei");
          test(c, "motor");
          test(c, "fam");
          upTo(c, 130);
          act(c, "diagnose", { dx: "red" });
          act(c, "refer", { how: "ped" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noAsk",
        title: "Connects and calls on the mother's remark without asking or watching",
        reasoning: "partial",
        drive: (c) => {
          test(c, "fam");
          act(c, "ei");
          act(c, "diagnose", { dx: "red" });
          act(c, "refer", { how: "ped" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "waited",
        title: "Failure: late talker, wait for the checkup",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "late" });
          act(c, "wait");
          act(c, "refer", { how: "letter" });
          toEnd(c);
        },
      },
      {
        id: "motorOk",
        title: "Failure: hears the loss but is reassured by his walking",
        reasoning: "missed",
        drive: (c) => {
          test(c, "loss");
          test(c, "motor");
          act(c, "diagnose", { dx: "motor" });
          act(c, "wait");
          toEnd(c);
        },
      },
    ],
  };
}
