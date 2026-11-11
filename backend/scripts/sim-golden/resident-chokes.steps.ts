// REQ-223 (batch S2b): golden paths for CNA/resident-chokes-at-lunch.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test`.
//
//   npm run sim:golden -- steps resident-chokes
import type { Ctl, StepsSpec } from "./steps.ts";
import { at, pace, teach, until, v } from "./s2b-helpers.ts";

export const ENTRY = { course: "CNA", slug: "resident-chokes-at-lunch" };

const free = (c: Ctl): void => until(c, (x) => v(x, "busy") === false || x.run.state.ended !== null);
const severe = (c: Ctl): void => until(c, (x) => v(x, "obst") === "severe");
const severeTick = (c: Ctl): number => c.run.state.tick;

function set(c: Ctl, kind: "blows" | "thrusts" | "cpr"): void {
  c.act(kind);
  teach(c);
  free(c);
}

function reportAndNote(c: Ctl, good: boolean): void {
  until(c, (x) => v(x, "nurseHere") === true && v(x, "breathing") === true);
  teach(c);
  c.act("report", good ? { what: "obj", did: "full", now: "now" } : { what: "interp", did: "vague", now: "fine" });
  c.act("document", { note: good ? "obj" : "opinion" });
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert path at study pace: lets the cough work, then shouts, stays, 5 back blows and 5 thrusts",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          at(c, 36);
          c.act("ask");
          c.act("encourage");
          severe(c);
          at(c, severeTick(c) + 1);
          c.act("ask");
          c.act("help");
          teach(c);
          set(c, "blows");
          set(c, "thrusts");
          set(c, "blows");
          c.act("ask");
          teach(c);
          reportAndNote(c, true);
        },
      },
      {
        id: "slowSafe",
        title: "Back blows while he could still cough, then 25 s of hesitation and abdominal thrusts only; good report",
        reasoning: "met",
        drive: (c) => {
          at(c, 40);
          set(c, "blows");
          severe(c);
          const s = severeTick(c);
          at(c, s + 25);
          c.act("ask");
          c.act("help");
          set(c, "thrusts");
          set(c, "thrusts");
          set(c, "thrusts");
          reportAndNote(c, true);
        },
      },
      {
        id: "leftAlone",
        title: "Leaves to find the nurse; he collapses alone; CPR, looks before breaths, removes what is visible",
        reasoning: "partial",
        drive: (c) => {
          severe(c);
          at(c, severeTick(c) + 5);
          c.act("leave");
          until(c, (x) => v(x, "nurseHere") === true);
          if (v(c, "onFloor") !== true) c.act("lower");
          set(c, "cpr");
          c.act("look");
          set(c, "cpr");
          c.act("look");
          c.act("remove");
          c.act("breaths");
          until(c, (x) => v(x, "responsive") === true);
          reportAndNote(c, true);
        },
      },
      {
        id: "collapseWithHelp",
        title: "Shouts for help but sweeps blindly and starts thrusts late; he goes limp in the chair; to the floor and CPR",
        reasoning: "partial",
        drive: (c) => {
          severe(c);
          const s = severeTick(c);
          at(c, s + 3);
          c.act("help");
          c.act("sweep");
          at(c, s + 75);
          c.act("thrusts");
          free(c);
          c.act("thrusts");
          until(c, (x) => v(x, "responsive") === false);
          c.act("ask");
          c.act("lower");
          set(c, "cpr");
          c.act("look");
          set(c, "cpr");
          c.act("look");
          c.act("remove");
          c.act("breaths");
          until(c, (x) => v(x, "responsive") === true);
          reportAndNote(c, false);
        },
      },
      {
        id: "frozen",
        title: "Water and a blind finger sweep, no call for help, no CPR: too long without air",
        reasoning: "missed",
        drive: (c) => {
          severe(c);
          at(c, severeTick(c) + 5);
          c.act("water");
          c.act("sweep");
          until(c, (x) => x.run.state.ended !== null, 5000);
        },
      },
    ],
  };
}
