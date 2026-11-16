// REQ-278 (nursing specialty bedside sims): golden paths for
// FNPAANP/clinic-severe-bp-stroke-signs. The expectations are the engine's
// own results, re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps fnp-stroke
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "FNPAANP", slug: "clinic-severe-bp-stroke-signs" };

const upTo = (c: Ctl, tick: number): void =>
  until(c, (x) => {
    teach(x);
    return x.run.state.tick >= tick || x.run.state.ended !== null;
  });
const toEnd = (c: Ctl): void =>
  until(c, (x) => {
    teach(x);
    return x.run.state.ended !== null;
  });
const ems = (c: Ctl): void =>
  until(c, (x) => {
    teach(x);
    return x.value("emsHere") === true || x.run.state.ended !== null;
  });

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: history, neuro check, glucose, last known well, 911, full handoff",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 20);
          c.act("history");
          c.act("neuro");
          c.act("glucose");
          c.act("call911");
          c.act("lkw");
          ems(c);
          c.act("handoff", { kind: "full" });
          toEnd(c);
        },
      },
      {
        id: "slowExam",
        title: "History first, the neuro check at 12 minutes, 911 at 15, no glucose, full handoff",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 60);
          c.act("history");
          upTo(c, 720);
          c.act("neuro");
          upTo(c, 900);
          c.act("call911");
          c.act("lkw");
          ems(c);
          c.act("handoff", { kind: "full" });
          toEnd(c);
        },
      },
      {
        id: "officeDrugs",
        title: "Deficit found and 911 called at once, but clonidine and aspirin while waiting, and a thin handoff",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 20);
          c.act("neuro");
          c.act("call911");
          c.act("clonidine");
          c.act("aspirin");
          ems(c);
          c.act("handoff", { kind: "brief" });
          toEnd(c);
        },
      },
      {
        id: "chaseNumber",
        title: "Failure: clonidine for the number and a recheck, no neuro check",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 60);
          c.act("clonidine");
          toEnd(c);
        },
      },
      {
        id: "sentHome",
        title: "Failure: a refill and a second drug, home with a follow-up in a week",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 120);
          c.act("history");
          c.act("sendHome");
          toEnd(c);
        },
      },
    ],
  };
}
