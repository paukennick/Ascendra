// REQ-276 (nursing specialty bedside sims): golden paths for
// CEN/waiting-room-esi-retriage. The expectations are the engine's own
// results, re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps cen-triage
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CEN", slug: "waiting-room-esi-retriage" };

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
const all = (c: Ctl, a: string, b: string, cc: string, d: string): void => {
  c.act("triB", { lvl: b });
  c.act("triC", { lvl: cc });
  c.act("triA", { lvl: a });
  c.act("triD", { lvl: d });
};

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: Ortiz and Diaz ESI 2, Chen 4, Brooks 3; waiting room rechecked at 15 and 20 minutes; Brooks re-triaged on the danger-zone heart rate; note",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 30);
          all(c, "4", "2", "2", "3");
          upTo(c, 900);
          c.act("recheck");
          upTo(c, 1200);
          c.act("recheck");
          if (c.value("dangerSeenAt") === null) {
            upTo(c, 1500);
            c.act("recheck");
          }
          c.act("retriage");
          c.act("note", { kind: "obj" });
          toEnd(c);
        },
      },
      {
        id: "lateRecheck",
        title: "Right levels, but the first recheck at 35 minutes and the re-triage after it",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 60);
          all(c, "4", "2", "2", "3");
          upTo(c, 2100);
          c.act("recheck");
          c.act("retriage");
          c.act("note", { kind: "obj" });
          toEnd(c);
        },
      },
      {
        id: "overTriage",
        title: "Everyone ESI 2 'to be safe': no one waits, but beds go to a sprained ankle",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 60);
          all(c, "2", "2", "2", "2");
          c.act("note", { kind: "opinion" });
          toEnd(c);
        },
      },
      {
        id: "sawItWaited",
        title: "Right levels and an early recheck that shows the change, but the re-triage waits 20 minutes",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 30);
          all(c, "4", "2", "2", "3");
          upTo(c, 1200);
          c.act("recheck");
          upTo(c, (c.value("recheckAt") as number) + 600);
          c.act("recheck");
          upTo(c, (c.value("dangerSeenAt") as number ?? c.run.state.tick) + 1200);
          c.act("retriage");
          toEnd(c);
        },
      },
      {
        id: "resources",
        title: "Failure: levels by resource count alone (Ortiz ESI 3), no recheck",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 60);
          all(c, "4", "3", "2", "3");
          toEnd(c);
        },
      },
      {
        id: "slowDesk",
        title: "Ortiz and Diaz ESI 2 at 12 minutes, Chen 5 and Brooks 4, never rechecked",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 720);
          all(c, "5", "2", "2", "4");
          c.act("note", { kind: "opinion" });
          toEnd(c);
        },
      },
      {
        id: "bothLow",
        title: "Failure: Ortiz and Diaz both sent to wait as ESI 3, Ms. Chen never triaged",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 60);
          c.act("triB", { lvl: "3" });
          c.act("triC", { lvl: "3" });
          c.act("triD", { lvl: "3" });
          toEnd(c);
        },
      },
    ],
  };
}
