// REQ-233 (bedside wave 1): golden paths for CCRNNEO/neonatal-rds-escalating-support.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps neo-rds
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until, v } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNNEO", slug: "neonatal-rds-escalating-support" };

const SURF = { sit: "rds", bg: "full", rec: "surf" };
const WATCH = { sit: "sat", bg: "min", rec: "watch" };
const SLIP = 3000;
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || x.run.state.ended !== null);
const n = (c: Ctl, name: string): number => v(c, name) as number;

interface Plan {
  cpapUp: boolean; // raise CPAP to 7 at the start
  callDelay: number | null; // seconds after the threshold to make the surfactant call, or never
  weanDown: boolean; // titrate oxygen down when above 94%
  fixDelay: number | null; // seconds after the prongs slip to check the interface, or never
  routineCall?: boolean; // a routine call instead of asking for surfactant
  gas?: boolean;
  titrate?: boolean; // false: never touches the oxygen
  cpap5?: boolean; // turns CPAP down to 5
}

function drive(c: Ctl, p: Plan): void {
  pace(c, 3);
  upTo(c, 10);
  c.act("look");
  if (p.fixDelay !== null) c.act("interface");
  if (p.cpapUp) c.act("pressure", { cm: "7" });
  if (p.cpap5) c.act("pressure", { cm: "5" });
  if (p.gas !== false) c.act("gas");
  let called = false;
  let surf = false;
  let fixed = false;
  while (c.run.state.ended === null) {
    const t = c.run.state.tick;
    teach(c);
    const need = c.value("needAt") as number | null;
    if (!called && need !== null && p.callDelay !== null && t >= need + p.callDelay) {
      c.act("call", p.routineCall ? WATCH : SURF);
      teach(c);
      c.skip("callbackT");
      called = true;
    }
    if (called && !surf && v(c, "surfOrdered") === true && c.value("surfAt") === null && v(c, "intubated") !== true) {
      c.act("surfactant");
      surf = true;
    }
    if (!fixed && p.fixDelay !== null && t >= SLIP + p.fixDelay && v(c, "slipped") === true) {
      c.act("interface");
      fixed = true;
    }
    const s = n(c, "spo2");
    if (c.run.state.ended === null && p.titrate !== false) {
      if (s < 90 && n(c, "fio2") < 1) c.act("oxygen", { step: s < 85 ? "up10" : "up5" });
      else if (p.weanDown && s > 94 && n(c, "fio2") > 0.21) c.act("oxygen", { step: "down5" });
    }
    upTo(c, t + 60);
  }
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: CPAP to 7, surfactant call at the threshold, LISA, oxygen weaned to 90-94%, slipped prongs found within 2 minutes",
        reasoning: "met",
        drive: (c) => drive(c, { cpapUp: true, callDelay: 0, weanDown: true, fixDelay: 90 }),
      },
      {
        id: "lateSurf",
        title: "Slow: CPAP left at 6, the surfactant call 40 minutes after the threshold, prongs found after 8 minutes",
        reasoning: "partial",
        drive: (c) => drive(c, { cpapUp: false, callDelay: 2400, weanDown: true, fixDelay: 480 }),
      },
      {
        id: "noWean",
        title: "Surfactant on time, but the oxygen is never weaned: hours above 95% on extra oxygen",
        reasoning: "met",
        drive: (c) => drive(c, { cpapUp: true, callDelay: 0, weanDown: false, fixDelay: 90 }),
      },
      {
        id: "oxygenOnly",
        title: "Failure: oxygen turned up for every dip, a routine call, no surfactant, prongs never checked",
        reasoning: "missed",
        drive: (c) => drive(c, { cpapUp: false, callDelay: 600, routineCall: true, weanDown: true, fixDelay: null, gas: false }),
      },
      {
        id: "noTitration",
        title: "Failure: CPAP turned down to 5, no surfactant call, the oxygen never adjusted and the prongs never checked",
        reasoning: "missed",
        drive: (c) => drive(c, { cpapUp: false, cpap5: true, callDelay: null, weanDown: false, fixDelay: null, gas: false, titrate: false }),
      },
    ],
  };
}
