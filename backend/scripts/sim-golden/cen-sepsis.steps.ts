// REQ-276 (nursing specialty bedside sims): golden paths for
// CEN/triage-sepsis-first-hour. The expectations are the engine's own
// results, re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps cen-sepsis
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CEN", slug: "triage-sepsis-first-hour" };

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
const orders = (c: Ctl): void =>
  until(c, (x) => {
    teach(x);
    return x.value("provHere") === true || x.run.state.ended !== null;
  });

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: ESI 2, protocol and a first liter, assess, antimicrobials on the order, two more liters, reassess after the fluid, timed note",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 20);
          c.act("triage", { lvl: "2" });
          c.act("protocol");
          c.act("bolus");
          c.act("assess");
          orders(c);
          c.act("abx");
          c.act("bolus");
          c.act("bolus");
          upTo(c, 3000);
          c.act("assess");
          c.act("note", { kind: "obj" });
          toEnd(c);
        },
      },
      {
        id: "esi3",
        title: "Triaged ESI 3 to the waiting room; full care once the physician sees her at 40 minutes",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 60);
          c.act("triage", { lvl: "3" });
          c.act("protocol");
          c.act("assess");
          orders(c);
          c.act("abx");
          c.act("bolus");
          c.act("bolus");
          c.act("bolus");
          upTo(c, 4800);
          c.act("assess");
          if (c.run.state.ended === null && (c.value("map") as number) < 65) c.act("norepi");
          c.act("note", { kind: "obj" });
          toEnd(c);
        },
      },
      {
        id: "oneLiter",
        title: "ESI 2 and antimicrobials on time, but one liter only and no reassessment; norepinephrine for the pressure",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 20);
          c.act("triage", { lvl: "2" });
          c.act("protocol");
          orders(c);
          c.act("abx");
          c.act("bolus");
          upTo(c, 1500);
          c.act("assess");
          if ((c.value("map") as number) < 65) c.act("norepi");
          toEnd(c);
        },
      },
      {
        id: "abxFirst",
        title: "ESI 2, antimicrobials hung before cultures were drawn, fluid at 35 minutes",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 20);
          c.act("triage", { lvl: "2" });
          orders(c);
          c.act("abx");
          upTo(c, 2100);
          c.act("protocol");
          c.act("bolus");
          c.act("bolus");
          c.act("assess");
          upTo(c, 4200);
          c.act("assess");
          c.act("note", { kind: "opinion" });
          toEnd(c);
        },
      },
      {
        id: "waitingRoom",
        title: "Failure: ESI 3, no protocol, norepinephrine with no fluid, the antimicrobial 20 minutes later",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 120);
          c.act("triage", { lvl: "3" });
          orders(c);
          upTo(c, (c.value("ordersAt") as number) + 180);
          c.act("norepi");
          upTo(c, c.run.state.tick + 1200);
          c.act("abx");
          toEnd(c);
        },
      },
      {
        id: "noCare",
        title: "Failure: ESI 3 and a note; nothing started while she waits",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 120);
          c.act("triage", { lvl: "3" });
          c.act("note", { kind: "opinion" });
          toEnd(c);
        },
      },
    ],
  };
}
