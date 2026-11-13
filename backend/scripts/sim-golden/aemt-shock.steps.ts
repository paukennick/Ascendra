// REQ-241 (bedside wave 2, EMS): golden paths for
// NREMTAEMT/hemorrhagic-shock-fluids. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps aemt-shock
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach } from "./s2b-helpers.ts";
import { act, at, ended, toEnd, v, when } from "./ems-helpers.ts";

export const ENTRY = { course: "NREMTAEMT", slug: "hemorrhagic-shock-fluids" };

function vitals(c: Ctl): void {
  act(c, "vitals");
  teach(c);
  when(c, (x) => v(x, "vPending") === false);
}
function iv(c: Ctl): void {
  act(c, "iv");
  teach(c);
  when(c, (x) => v(x, "ivOn") === true);
}
function tq(c: Ctl): void {
  act(c, "tourniquet");
  teach(c);
  when(c, (x) => v(x, "tqOn") === true);
}
// Boluses to the target with a recheck after each, until arrival.
function titrate(c: Ctl, limit = 1500): void {
  while (!ended(c) && v(c, "arrivedAt") === null) {
    if ((v(c, "sbp") as number) < 88 && (v(c, "fluidIn") as number) < limit && v(c, "bolusLeft") === 0) {
      act(c, "bolus");
      when(c, (x) => v(x, "bolusLeft") === 0 || v(x, "arrivedAt") !== null);
      if (!ended(c) && v(c, "arrivedAt") === null) vitals(c);
    } else {
      at(c, c.run.state.tick + 60);
    }
  }
  toEnd(c);
}
function go(c: Ctl, where: string, notify = true): void {
  act(c, "transport", { where });
  teach(c);
  if (notify) act(c, "notify");
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: tourniquet first, quick survey, red criteria, Level I center, IV en route, boluses to a radial pulse with rechecks",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          tq(c);
          act(c, "look");
          act(c, "oxygen");
          act(c, "monitor");
          vitals(c);
          act(c, "warm");
          go(c, "far");
          iv(c);
          titrate(c);
        },
      },
      {
        id: "ivOnScene",
        title: "Good care, but the IV and two boluses on scene: 15 minutes before the wheels roll",
        reasoning: "partial",
        drive: (c) => {
          tq(c);
          act(c, "look");
          act(c, "monitor");
          vitals(c);
          act(c, "warm");
          iv(c);
          act(c, "bolus");
          when(c, (x) => v(x, "bolusLeft") === 0);
          vitals(c);
          act(c, "bolus");
          when(c, (x) => v(x, "bolusLeft") === 0);
          vitals(c);
          at(c, 720);
          go(c, "far");
          titrate(c);
        },
      },
      {
        id: "wideOpen",
        title: "Tourniquet and the right center, but the saline runs wide open all the way: pressure pushed up, more bleeding",
        reasoning: "partial",
        drive: (c) => {
          tq(c);
          act(c, "look");
          act(c, "monitor");
          go(c, "far");
          iv(c);
          act(c, "wideOpen");
          vitals(c);
          toEnd(c);
        },
      },
      {
        id: "community",
        title: "Well-run resuscitation, but the nearer community hospital without a trauma surgeon",
        reasoning: "partial",
        drive: (c) => {
          tq(c);
          act(c, "look");
          act(c, "oxygen");
          act(c, "monitor");
          vitals(c);
          act(c, "warm");
          go(c, "near");
          iv(c);
          titrate(c);
        },
      },
      {
        id: "noFluid",
        title: "Tourniquet and the trauma center, but no IV or fluid and no warming: he arrives barely perfusing",
        reasoning: "partial",
        drive: (c) => {
          tq(c);
          act(c, "look");
          act(c, "monitor");
          vitals(c);
          go(c, "far", false);
          toEnd(c);
        },
      },
      {
        id: "armBleeds",
        title: "Failure: survey, monitor and an IV attempt while the arm keeps spurting; no tourniquet, no fluid; he arrests on scene",
        reasoning: "missed",
        drive: (c) => {
          act(c, "look");
          act(c, "monitor");
          vitals(c);
          act(c, "oxygen");
          act(c, "iv");
          at(c, 360);
          tq(c);
          go(c, "near");
          toEnd(c);
        },
      },
    ],
  };
}
