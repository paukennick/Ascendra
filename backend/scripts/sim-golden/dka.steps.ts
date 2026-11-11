// REQ-222 (batch S2a): golden paths for CCRNADULT/dka-first-six-hours.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps dka
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "CCRNADULT", slug: "dka-first-six-hours" };

const n = (c: Ctl, name: string): number => c.value(name) as number;
const pending = (c: Ctl, timer: string): boolean => c.run.state.timers.some((x) => x.timer === timer);

function until(c: Ctl, at: number): void {
  if (c.run.state.tick < at) c.wait(at - c.run.state.tick);
}

function labResult(c: Ctl): void {
  c.act("gas");
  while (pending(c, "labT") && !c.run.state.ended) c.skip("labT");
  c.answer();
}

// Start: assess, check glucose and the gas, fluids up, potassium first.
function start(c: Ctl, call = true): void {
  until(c, 30);
  c.act("look");
  c.act("glucose");
  c.act("fluids", { rate: "1000" });
  labResult(c);
  c.act("potassium", { plan: "perHour" });
  if (call) {
    c.act("call", { why: "kLow" });
    c.skip("callbackT");
  }
  // recheck the potassium until it is 3.5 or more, then insulin
  until(c, 4200);
  for (;;) {
    labResult(c);
    if (n(c, "kLast") >= 3.5) break;
    c.wait(900);
  }
}

interface Plan {
  insulin: string;
  glucoseEvery: number; // seconds between glucose checks
  onBelow250: "dex" | "stop" | "none";
  keepFluid?: boolean; // leave the fluid at 1,000 mL/h
}

// Run to the end of the case: glucose and labs on schedule, react to POC glucose.
function runOut(c: Ctl, p: Plan): void {
  let lastGlucose = c.run.state.tick;
  let fluidDown = false;
  let below = false;
  while (!c.run.state.ended) {
    if (c.run.state.tick - lastGlucose >= p.glucoseEvery - 1) {
      c.answer();
      c.act("glucose");
      lastGlucose = c.run.state.tick;
      if (!below && n(c, "gLast") < 250) {
        below = true;
        if (p.onBelow250 === "dex") {
          c.act("dextrose", { on: "start" });
          c.act("insulin", { dose: "0.05" });
        } else if (p.onBelow250 === "stop") c.act("insulin", { dose: "0" });
      }
    }
    if (!pending(c, "nextLabsT") && !pending(c, "labT")) labResult(c);
    if (!fluidDown && !p.keepFluid && c.run.state.tick >= 7200) {
      c.act("fluids", { rate: "500" });
      fluidDown = true;
    }
    if (c.run.state.ended) break;
    const nextG = lastGlucose + p.glucoseEvery;
    const w = c.run.state.tick < nextG ? nextG - c.run.state.tick : 1;
    c.wait(Math.min(w, 600));
  }
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert: fluids first, potassium before insulin, 0.1 units/kg/h, hourly checks, dextrose and 0.05 below 250",
        reasoning: "met",
        drive: (c) => {
          start(c);
          c.act("insulin", { dose: "0.1" });
          c.act("potassium", { plan: "perL" });
          runOut(c, { insulin: "0.1", glucoseEvery: 3600, onBelow250: "dex" });
        },
      },
      {
        id: "slowSafe",
        title: "Slow but safe: the right order, but glucose only every 2 hours, so the dextrose comes late",
        reasoning: "partial",
        drive: (c) => {
          start(c, false);
          c.act("insulin", { dose: "0.1" });
          c.act("potassium", { plan: "perL" });
          runOut(c, { insulin: "0.1", glucoseEvery: 7200, onBelow250: "dex" });
        },
      },
      {
        id: "insulinBeforePotassium",
        title: "Failure: insulin at once with no potassium check, bicarbonate, no potassium and no extra fluid",
        reasoning: "missed",
        drive: (c) => {
          until(c, 60);
          c.act("glucose");
          c.act("insulin", { dose: "0.1" });
          c.act("bicarb");
          c.waitUntil((r) => r.state.ended !== null);
        },
      },
      {
        id: "tooFast",
        title: "Failure: potassium first, then insulin at 0.2 units/kg/h, fluid left at 1,000 mL/h, and no dextrose",
        reasoning: "partial",
        drive: (c) => {
          start(c);
          c.act("insulin", { dose: "0.2" });
          c.act("potassium", { plan: "perL" });
          runOut(c, { insulin: "0.2", glucoseEvery: 3600, onBelow250: "none", keepFluid: true });
        },
      },
      {
        id: "stoppedInsulin",
        title: "Insulin stopped when the glucose fell below 250, with no dextrose: the ketones climb again",
        reasoning: "partial",
        drive: (c) => {
          start(c);
          c.act("insulin", { dose: "0.1" });
          c.act("potassium", { plan: "perL" });
          runOut(c, { insulin: "0.1", glucoseEvery: 3600, onBelow250: "stop" });
        },
      },
    ],
  };
}
