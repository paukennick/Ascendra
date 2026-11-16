// REQ-296 (clinical coverage): golden paths for PTPREREQ/cycle-test-falling-pressure.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps ptprereq-gxt
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "PTPREREQ", slug: "cycle-test-falling-pressure" };

const ended = (c: Ctl): boolean => c.run.state.ended !== null;
const rel = (c: Ctl): number => c.value("tRel") as number;
const toRel = (c: Ctl, s: number): void => until(c, (x) => rel(x) >= s || ended(x));
const toEnd = (c: Ctl): void => until(c, (x) => ended(x), 20000);
function act(c: Ctl, a: string, p?: Record<string, string>): void {
  if (ended(c)) return;
  c.act(a, p);
  teach(c);
}
function bp(c: Ctl): void {
  act(c, "bp");
  until(c, (x) => x.value("bpPending") === false || ended(x));
}
function prep(c: Ctl, tell = true): void {
  act(c, "screen");
  act(c, "restBp");
  if (tell) act(c, "tellInstructor", { what: "donation" });
  act(c, "start");
}
function stages(c: Ctl, f = "third"): void {
  toRel(c, 180);
  bp(c);
  act(c, "calc", { f });
  act(c, "interpret", { i: "normal" });
  toRel(c, 360);
  bp(c);
  act(c, "calc", { f });
  act(c, "interpret", { i: "normal" });
}
const sx = (c: Ctl): void => until(c, (x) => x.value("sxAt") !== null || ended(x));
function recover(c: Ctl): void {
  until(c, (x) => (x.value("def") as number) <= 8 || ended(x));
  bp(c);
  toEnd(c);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: screen, resting BP, instructor told of the donation; BP, PP and MAP every stage; stops on the systolic fall with an unloaded cool-down; recovery BP",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          prep(c);
          stages(c);
          toRel(c, 540);
          bp(c);
          act(c, "calc", { f: "third" });
          act(c, "interpret", { i: "narrow" });
          act(c, "stop", { how: "cool" });
          act(c, "tellInstructor", { what: "event" });
          recover(c);
        },
      },
      {
        id: "notTold",
        title: "Right readings and a cool-down stop on the fall, but the donation never reached the instructor before the test",
        reasoning: "partial",
        drive: (c) => {
          prep(c, false);
          stages(c);
          toRel(c, 540);
          bp(c);
          act(c, "calc", { f: "third" });
          act(c, "interpret", { i: "narrow" });
          act(c, "stop", { how: "cool" });
          act(c, "tellInstructor", { what: "event" });
          recover(c);
        },
      },
      {
        id: "stillThenLie",
        title: "Stops at the first symptoms but has him sit still on the bike; lays him down when he goes gray",
        reasoning: "partial",
        drive: (c) => {
          prep(c);
          stages(c, "half");
          act(c, "calc", { f: "third" });
          sx(c);
          act(c, "stop", { how: "still" });
          act(c, "lieDown");
          act(c, "tellInstructor", { what: "event" });
          recover(c);
        },
      },
      {
        id: "lateStop",
        title: "Readings at two stages only; keeps going 90 seconds after he goes pale, then a cool-down",
        reasoning: "partial",
        drive: (c) => {
          prep(c);
          stages(c);
          sx(c);
          c.wait(90);
          act(c, "stop", { how: "cool" });
          recover(c);
        },
      },
      {
        id: "standUp",
        title: "Failure: stops at the symptoms and has him get off and stand",
        reasoning: "missed",
        drive: (c) => {
          prep(c);
          stages(c);
          sx(c);
          act(c, "stop", { how: "stand" });
          toEnd(c);
        },
      },
      {
        id: "pushOn",
        title: "Failure: no screen, the wrong formulas, reads the readings as normal and never stops",
        reasoning: "missed",
        drive: (c) => {
          act(c, "start");
          toRel(c, 180);
          bp(c);
          act(c, "calc", { f: "sum" });
          toRel(c, 540);
          bp(c);
          act(c, "interpret", { i: "normal" });
          toEnd(c);
        },
      },
      {
        id: "noReadings",
        title: "Screened and told, but no BP under load; stops on the symptoms with a cool-down",
        reasoning: "partial",
        drive: (c) => {
          prep(c);
          sx(c);
          act(c, "stop", { how: "cool" });
          act(c, "tellInstructor", { what: "event" });
          recover(c);
        },
      },
    ],
  };
}
