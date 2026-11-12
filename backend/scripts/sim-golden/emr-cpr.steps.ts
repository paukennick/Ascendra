// REQ-241 (bedside wave 2, EMS): golden paths for
// NREMTEMR/unresponsive-adult-cpr-aed. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`
// (lint + documents).
//
//   npm run sim:golden -- steps emr-cpr
import type { Ctl, StepsSpec } from "./steps.ts";
import { chapters, pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NREMTEMR", slug: "unresponsive-adult-cpr-aed" };

const v = (c: Ctl, n: string): unknown => c.value(n);
const toEnd = (c: Ctl): void => until(c, (x) => x.run.state.ended !== null, 20000);
const at = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || x.run.state.ended !== null);
function check(c: Ctl): void {
  c.act("check");
  teach(c);
  until(c, (x) => v(x, "checking") === false || x.run.state.ended !== null);
}
function analyzeAndShock(c: Ctl): void {
  until(c, (x) => v(x, "aedReady") === true || x.run.state.ended !== null);
  c.act("analyze");
  until(c, (x) => v(x, "analyzing") === false || x.run.state.ended !== null);
  if (v(c, "shockReady") === true) shock(c);
}
function shock(c: Ctl): void {
  c.act("shock");
  c.answer();
  chapters(c);
}
function cycle(c: Ctl, swap = true): void {
  teach(c);
  until(c, (x) => v(x, "analyzeDue") === true || x.run.state.ended !== null);
  if (c.run.state.ended) return;
  if (swap && v(c, "cprOn") === true) c.act("swap");
  c.act("analyze");
  until(c, (x) => v(x, "analyzing") === false || x.run.state.ended !== null);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: check in under 10 s, compressions, pads during CPR, shock, straight back on the chest, BVM, switch, pulse found, clean handoff",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          c.act("scene");
          c.act("tapShout");
          c.act("requestAls");
          check(c);
          c.act("startCpr");
          c.act("aedOn");
          teach(c);
          analyzeAndShock(c);
          c.act("startCpr");
          c.act("bvm");
          cycle(c);
          check(c);
          c.act("postRosc");
          teach(c);
          until(c, (x) => v(x, "crewHere") === true || x.run.state.ended !== null);
          c.act("handoff", { report: "full" });
          toEnd(c);
        },
      },
      {
        id: "slowAed",
        title: "Good CPR, but the AED goes on only after 3 minutes and ALS is asked for late",
        reasoning: "partial",
        drive: (c) => {
          c.act("scene");
          c.act("tapShout");
          check(c);
          c.act("startCpr");
          c.act("bvm");
          at(c, 75);
          c.act("requestAls");
          at(c, 130);
          c.act("swap");
          at(c, 200);
          c.act("aedOn");
          teach(c);
          analyzeAndShock(c);
          c.act("startCpr");
          cycle(c);
          check(c);
          c.act("postRosc");
          teach(c);
          until(c, (x) => v(x, "crewHere") === true || x.run.state.ended !== null);
          c.act("handoff", { report: "full" });
          toEnd(c);
        },
      },
      {
        id: "pulseChecks",
        title: "Early shock, then a pulse check after it and repeated checks: long hands-off time, no BVM, a vague report",
        reasoning: "partial",
        drive: (c) => {
          c.act("tapShout");
          c.act("requestAls");
          check(c);
          c.act("startCpr");
          c.act("aedOn");
          teach(c);
          analyzeAndShock(c);
          for (let i = 0; i < 6 && v(c, "roscFoundAt") === null; i++) {
            check(c);
            if (v(c, "roscFoundAt") !== null) break;
            at(c, c.run.state.tick + 10);
            c.act("startCpr");
            at(c, c.run.state.tick + 20);
          }
          until(c, (x) => v(x, "crewHere") === true || x.run.state.ended !== null);
          c.act("handoff", { report: "vague" });
          toEnd(c);
        },
      },
      {
        id: "lateStart",
        title: "Compressions only after 90 s without a proper check; the first shock fails and the paramedics take over mid-arrest",
        reasoning: "partial",
        drive: (c) => {
          c.act("scene");
          c.act("requestAls");
          at(c, 90);
          c.act("tapShout");
          c.act("startCpr");
          c.act("aedOn");
          teach(c);
          analyzeAndShock(c);
          c.act("startCpr");
          c.act("bvm");
          for (let i = 0; i < 3 && !c.run.state.ended && v(c, "crewHere") !== true; i++) {
            cycle(c);
            if (v(c, "shockReady") === true) shock(c);
            if (!c.run.state.ended && v(c, "cprOn") !== true && v(c, "crewHere") !== true) c.act("startCpr");
          }
          until(c, (x) => v(x, "crewHere") === true || x.run.state.ended !== null);
          if (!c.run.state.ended) c.act("handoff", { report: "full" });
          toEnd(c);
        },
      },
      {
        id: "gasps",
        title: "Failure: the gasps are taken for breathing and he is put in the recovery position; CPR late, the shock fails, no ALS, VF fades to asystole",
        reasoning: "missed",
        drive: (c) => {
          c.act("tapShout");
          c.act("recovery");
          at(c, 100);
          check(c);
          c.act("startCpr");
          c.act("aedOn");
          teach(c);
          analyzeAndShock(c);
          c.act("startCpr");
          for (let i = 0; i < 6 && !c.run.state.ended; i++) {
            cycle(c, false);
            if (v(c, "shockReady") === true) shock(c);
            if (!c.run.state.ended && v(c, "cprOn") !== true) c.act("startCpr");
          }
          toEnd(c);
        },
      },
      {
        id: "noAed",
        title: "Failure: good compressions, BVM and switches, but the AED never goes on",
        reasoning: "missed",
        drive: (c) => {
          c.act("scene");
          c.act("tapShout");
          c.act("requestAls");
          check(c);
          c.act("startCpr");
          c.act("bvm");
          for (const tk of [130, 260]) {
            at(c, tk);
            c.act("swap");
          }
          teach(c);
          until(c, (x) => v(x, "crewHere") === true || x.run.state.ended !== null);
          c.act("handoff", { report: "full" });
          toEnd(c);
        },
      },
    ],
  };
}
