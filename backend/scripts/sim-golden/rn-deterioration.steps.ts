// REQ-233 (bedside wave 1): golden paths for NCLEXRN/med-surg-deterioration-sbar.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps rn-deterioration
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until, v } from "./s2b-helpers.ts";

export const ENTRY = { course: "NCLEXRN", slug: "med-surg-deterioration-sbar" };

const GOOD = { sit: "sepsis", bg: "full", asmt: "leak", rec: "come" };
const ROUTINE = { sit: "check", bg: "min", asmt: "unsure", rec: "later" };
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || x.run.state.ended !== null);
const toEnd = (c: Ctl): void => until(c, (x) => x.run.state.ended !== null, 20000);
// Do one RN task and wait until it is finished, answering teaching prompts on the way.
function task(c: Ctl, action: string, params?: Record<string, string>): void {
  if (c.run.state.ended) return;
  c.act(action, params);
  teach(c);
  until(c, (x) => v(x, "rnBusy") === false || x.run.state.ended !== null);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: Bed 12 first, an SBAR naming sepsis, teaching handed to the charge nurse, cultures then fluid and antibiotic, then pain and insulin",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 5);
          c.act("uapBath");
          task(c, "assess12");
          task(c, "call", GOOD);
          c.act("chargeTeach");
          task(c, "labs");
          task(c, "infuse");
          task(c, "pain");
          task(c, "insulin");
          toEnd(c);
        },
      },
      {
        id: "slowRrt",
        title: "Bed 10's pain first, then Bed 12; a routine call answered 'recheck in an hour', then the rapid response team 15 minutes later",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 30);
          task(c, "pain");
          task(c, "assess12");
          task(c, "call", ROUTINE);
          upTo(c, c.run.state.tick + 900);
          c.act("rrt");
          c.skip("rrtT");
          task(c, "labs");
          task(c, "infuse");
          task(c, "insulin");
          task(c, "teach");
          toEnd(c);
        },
      },
      {
        id: "delegatedAssessment",
        title: "Asks the assistant whether Bed 12 is okay, gives insulin and pain medicine first, sees Bed 12 at 08:15",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          c.act("uapAssess");
          task(c, "insulin");
          task(c, "pain");
          upTo(c, 2700);
          task(c, "assess12");
          task(c, "call", GOOD);
          c.act("chargeTeach");
          task(c, "labs");
          task(c, "infuse");
          toEnd(c);
        },
      },
      {
        id: "waitAnHour",
        title: "Sees Bed 12 first but accepts 'recheck in an hour'; the second call lands too late to start treatment",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          task(c, "assess12");
          task(c, "call", ROUTINE);
          task(c, "pain");
          task(c, "insulin");
          task(c, "teach");
          upTo(c, 6000);
          c.act("uapVitals");
          c.skip("uapT");
          task(c, "call", GOOD);
          toEnd(c);
        },
      },
      {
        id: "tunnelVision",
        title: "Bed 12 rescued fast, but nothing delegated or handed off: Bed 10, 11 and 14 left waiting",
        reasoning: "met",
        drive: (c) => {
          upTo(c, 5);
          task(c, "assess12");
          task(c, "call", GOOD);
          task(c, "labs");
          task(c, "infuse");
          toEnd(c);
        },
      },
      {
        id: "tasksFirst",
        title: "Failure: the stable clients' tasks in the order they asked, Bed 12 never assessed",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 10);
          task(c, "pain");
          task(c, "insulin");
          task(c, "teach");
          toEnd(c);
        },
      },
    ],
  };
}
