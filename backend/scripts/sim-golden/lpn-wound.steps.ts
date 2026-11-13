// REQ-240 (bedside wave 2): golden paths for LPNVN/ltc-pressure-injury-infection.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps lpn-wound
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "LPNVN", slug: "ltc-pressure-injury-infection" };

const GOOD = { sit: "worse", bg: "full", asmt: "infection", rec: "come" };
const ROUTINE = { sit: "dressing", bg: "min", asmt: "healing", rec: "thursday" };
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || x.run.state.ended !== null);
const toEnd = (c: Ctl): void => until(c, (x) => x.run.state.ended !== null, 20000);
function vitals(c: Ctl): void {
  c.act("vitals");
  teach(c);
  until(c, (x) => x.value("vPending") === false || x.run.state.ended !== null);
}
function woundCare(c: Ctl): void {
  c.act("hygiene");
  c.act("remove");
  c.act("cleanse");
  c.act("measure");
  c.act("record");
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: gown and gloves, cleanse, measure and compare, vital signs, glucose, orientation, SBAR naming the infection, ordered dressing, turn, objective note",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 10);
          woundCare(c);
          vitals(c);
          c.act("glucose");
          c.act("orient");
          c.act("report", GOOD);
          c.act("dress");
          c.act("turn");
          c.act("note", { kind: "obj" });
          teach(c);
          c.skip("rnT");
          teach(c);
          toEnd(c);
        },
      },
      {
        id: "routineFirst",
        title: "Careful wound care and data, but the first report sounds routine; a clear report 20 minutes later reaches the provider after the confusion starts",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 60);
          woundCare(c);
          c.act("dress");
          vitals(c);
          c.act("report", ROUTINE);
          upTo(c, c.run.state.tick + 1200);
          c.act("glucose");
          c.act("orient");
          c.act("report", GOOD);
          c.act("turn");
          c.act("note", { kind: "obj" });
          toEnd(c);
        },
      },
      {
        id: "noGown",
        title: "Fast and complete, but the dressing comes off bare-handed without a gown",
        reasoning: "met",
        drive: (c) => {
          upTo(c, 10);
          c.act("remove");
          c.act("cleanse");
          c.act("measure");
          c.act("record");
          vitals(c);
          c.act("glucose");
          c.act("orient");
          c.act("report", GOOD);
          c.act("dress");
          c.act("turn");
          c.act("note", { kind: "obj" });
          toEnd(c);
        },
      },
      {
        id: "silverLate",
        title: "Failure: another resident's silver dressing, no measurements, and a report only after the assistant's warning",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 120);
          c.act("hygiene");
          c.act("remove");
          c.act("cleanse");
          c.act("silver");
          vitals(c);
          until(c, (x) => x.run.state.tick >= 2710 || x.run.state.ended !== null);
          c.act("report", GOOD);
          c.act("note", { kind: "opinion" });
          toEnd(c);
        },
      },
      {
        id: "leftForThursday",
        title: "Failure: wound care done and the change seen, but left for the wound nurse on Thursday, and no note",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 300);
          woundCare(c);
          c.act("dress");
          c.act("thursday");
          toEnd(c);
        },
      },
    ],
  };
}
