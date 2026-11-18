// REQ-338 (docs/sims.md 22.42): golden paths for
// NREMTPARAMEDIC/medic-assisted-living-fever-confused. No prototype; the
// expectations are the engine's own results.
//
//   npm run sim:golden -- steps medic-sepsis
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";
import { pace, teach } from "./s2b-helpers.ts";
import { act, at, toEnd, v, when } from "./ems-helpers.ts";

export const ENTRY = { course: "NREMTPARAMEDIC", slug: "medic-assisted-living-fever-confused" };

function wait(c: Ctl, flag: string): void {
  when(c, (x) => v(x, flag) === false);
}
function bolus(c: Ctl, check: boolean): void {
  act(c, "bolus");
  teach(c);
  wait(c, "bolusing");
  if (check) {
    act(c, "lungs");
    wait(c, "lPending");
  }
}

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Expert at study pace: septic shock recognized with temperature, glucose and capnography; oxygen, two IVs; three boluses with a lung check after each; sepsis alert; load early",
      reasoning: "met",
      drive: (c) => {
        pace(c, 3);
        act(c, "look");
        act(c, "monitor");
        act(c, "vitals");
        act(c, "temp");
        act(c, "glucose");
        act(c, "capno");
        act(c, "o2");
        act(c, "iv");
        wait(c, "ivPending");
        act(c, "alert");
        act(c, "transport");
        bolus(c, true);
        bolus(c, true);
        bolus(c, true);
        act(c, "vitals");
        toEnd(c);
      },
    },
    {
      id: "oneCheck",
      title: "Workup, alert and two boluses, but only one lung check",
      reasoning: "partial",
      drive: (c) => {
        act(c, "look");
        act(c, "temp");
        act(c, "glucose");
        act(c, "o2");
        act(c, "iv");
        wait(c, "ivPending");
        act(c, "alert");
        bolus(c, false);
        bolus(c, true);
        act(c, "transport");
        toEnd(c);
      },
    },
    {
      id: "lateFluid",
      title: "A long workup; fluids only at 12 minutes; alert sent early; she arrives just short of the goal",
      reasoning: "partial",
      drive: (c) => {
        act(c, "look");
        act(c, "monitor");
        act(c, "temp");
        act(c, "glucose");
        act(c, "o2");
        act(c, "alert");
        at(c, 600);
        act(c, "iv");
        wait(c, "ivPending");
        act(c, "transport");
        bolus(c, true);
        toEnd(c);
      },
    },
    {
      id: "overload",
      title: "Four boluses back to back without listening to her lungs",
      reasoning: "missed",
      drive: (c) => {
        act(c, "iv");
        wait(c, "ivPending");
        act(c, "transport");
        bolus(c, false);
        bolus(c, false);
        bolus(c, false);
        bolus(c, false);
        toEnd(c);
      },
    },
    {
      id: "noFluid",
      title: "Blood pressure taken and straight to the hospital; no IV, no fluid",
      reasoning: "missed",
      drive: (c) => {
        act(c, "vitals");
        act(c, "transport");
        toEnd(c);
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
