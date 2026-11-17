// REQ-323 (health depth, round 2): golden paths for
// PCCN/capnography-alarm-saturation-fine. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps pccn-capno
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "PCCN", slug: "capnography-alarm-saturation-fine" };

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
        title: "Expert at study pace: the capnography trend, POSS, opioids held, CPAP, rapid response, titrated naloxone, SBAR",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "capno");
          test(c, "possCk");
          act(c, "hold");
          act(c, "cpap");
          act(c, "refer", { how: "rrt" });
          act(c, "naloxone");
          act(c, "diagnose", { dx: "oird" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Reads the record, the trend and the POSS, holds opioids and puts on CPAP, but calls rapid response 6 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "mar");
          test(c, "capno");
          test(c, "possCk");
          act(c, "hold");
          act(c, "cpap");
          upTo(c, 110);
          act(c, "naloxone");
          act(c, "refer", { how: "rrt" });
          act(c, "diagnose", { dx: "oird" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noCpap",
        title: "Calls promptly and titrates naloxone, but his CPAP stays off",
        reasoning: "partial",
        drive: (c) => {
          test(c, "capno");
          test(c, "possCk");
          act(c, "hold");
          act(c, "refer", { how: "rrt" });
          act(c, "naloxone");
          act(c, "diagnose", { dx: "oird" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "fullBolus",
        title: "Failure: scores POSS 3, holds opioids, then pushes the whole naloxone vial",
        reasoning: "missed",
        drive: (c) => {
          test(c, "possCk");
          act(c, "hold");
          act(c, "bolus");
          toEnd(c);
        },
      },
      {
        id: "silenced",
        title: "Failure: silences the alarm because the saturation is fine and gives hydromorphone when he stirs",
        reasoning: "missed",
        drive: (c) => {
          act(c, "silence");
          act(c, "diagnose", { dx: "sensor" });
          act(c, "prn");
          toEnd(c);
        },
      },
      {
        id: "morningNote",
        title: "Failure: reads the record, calls it normal sleep and leaves a note for the morning",
        reasoning: "missed",
        drive: (c) => {
          test(c, "mar");
          act(c, "diagnose", { dx: "sleep" });
          act(c, "refer", { how: "morning" });
          toEnd(c);
        },
      },
    ],
  };
}
