// REQ-233 (bedside wave 1): golden paths for NCLEXPN/ltc-change-in-condition.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps pn-change
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NCLEXPN", slug: "ltc-change-in-condition" };

const GOOD = { sit: "change", bg: "full", asmt: "infection", rec: "come" };
const ROUTINE = { sit: "tired", bg: "min", asmt: "normal", rec: "wait" };
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || x.run.state.ended !== null);
const toEnd = (c: Ctl): void => until(c, (x) => x.run.state.ended !== null, 20000);
function vitals(c: Ctl): void {
  c.act("vitals");
  teach(c);
  until(c, (x) => x.value("vPending") === false || x.run.state.ended !== null);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: looks, vital signs, glucose, baseline, urine and intake, SBAR naming an acute change, standing-order care, objective note",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 10);
          c.act("look");
          vitals(c);
          c.act("glucose");
          c.act("chart");
          c.act("urine");
          c.act("report", GOOD);
          c.act("fluids");
          if ((c.value("vSpo2") as number) < 92) c.act("oxygen");
          teach(c);
          c.skip("rnT");
          c.act("family");
          c.act("note", { kind: "obj" });
          toEnd(c);
        },
      },
      {
        id: "routineFirst",
        title: "Vital signs and baseline, but the first report sounds routine; a second, clear report 25 minutes later",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 120);
          vitals(c);
          c.act("chart");
          c.act("report", ROUTINE);
          c.act("fluids");
          upTo(c, c.run.state.tick + 1500);
          vitals(c);
          c.act("report", GOOD);
          c.act("note", { kind: "obj" });
          toEnd(c);
        },
      },
      {
        id: "noBaseline",
        title: "Reports quickly from the vital signs alone, never checking her baseline; an opinion in the note",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          vitals(c);
          c.act("report", GOOD);
          c.act("note", { kind: "opinion" });
          toEnd(c);
        },
      },
      {
        id: "sedated",
        title: "Failure: lorazepam for the restlessness and a recheck planned for later; the report comes after the assistant's second warning",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 300);
          c.act("lorazepam");
          c.act("recheckLater");
          until(c, (x) => x.run.state.tick >= 1800 || x.run.state.ended !== null);
          vitals(c);
          c.act("chart");
          c.act("report", GOOD);
          toEnd(c);
        },
      },
      {
        id: "explainedAway",
        title: "Failure: 'it's her dementia', a leftover antibiotic, and no vital signs",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 300);
          c.act("look");
          c.act("leftoverAbx");
          c.act("recheckLater");
          c.act("note", { kind: "opinion" });
          toEnd(c);
        },
      },
    ],
  };
}
