// REQ-241 (bedside wave 2, EMS): golden paths for
// NREMTEMT/anaphylaxis-epinephrine. No prototype exists, so the expectations
// are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps emt-anaph
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";
import { act } from "./ems-helpers.ts";

export const ENTRY = { course: "NREMTEMT", slug: "anaphylaxis-epinephrine" };

const v = (c: Ctl, n: string): unknown => c.value(n);
const toEnd = (c: Ctl): void => until(c, (x) => x.run.state.ended !== null, 20000);
const at = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || x.run.state.ended !== null);
const ADULT = { dose: "adult", site: "thigh" };
function vitals(c: Ctl): void {
  act(c, "vitals");
  teach(c);
  until(c, (x) => v(x, "vPending") === false || x.run.state.ended !== null);
}
function go(c: Ctl, how: string): void {
  act(c, "transport", { how });
  teach(c);
  act(c, "notify");
}
function repeatWhenDue(c: Ctl, p = ADULT, check = true): void {
  until(c, (x) => v(x, "repeatDueAt") !== null || v(x, "arrivedAt") !== null || x.run.state.ended !== null);
  if (!c.run.state.ended && v(c, "arrivedAt") === null) {
    if (check) vitals(c);
    act(c, "epinephrine", p);
  }
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: recognized at a glance, checked 0.3 mg IM thigh at once, flat, oxygen, intercept, stretcher, second dose when the pressure falls",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          act(c, "look");
          act(c, "checkMed");
          act(c, "epinephrine", ADULT);
          act(c, "flat");
          act(c, "oxygen");
          vitals(c);
          act(c, "history");
          act(c, "requestAls");
          at(c, 120);
          go(c, "stretcher");
          repeatWhenDue(c);
          act(c, "albuterol");
          toEnd(c);
        },
      },
      {
        id: "lateEpi",
        title: "Watches the hives for a few minutes; the first dose comes at 6 minutes, then a good repeat",
        reasoning: "partial",
        drive: (c) => {
          act(c, "look");
          act(c, "history");
          vitals(c);
          act(c, "watch");
          act(c, "albuterol");
          at(c, 360);
          act(c, "checkMed");
          act(c, "epinephrine", ADULT);
          act(c, "flat");
          act(c, "oxygen");
          at(c, 480);
          go(c, "stretcher");
          repeatWhenDue(c);
          toEnd(c);
        },
      },
      {
        id: "juniorArm",
        title: "A junior 0.15 mg auto-injector into the upper arm without a check; no repeat",
        reasoning: "partial",
        drive: (c) => {
          act(c, "look");
          act(c, "epinephrine", { dose: "junior", site: "arm" });
          act(c, "flat");
          act(c, "oxygen");
          vitals(c);
          act(c, "requestAls");
          at(c, 180);
          go(c, "stretcher");
          toEnd(c);
        },
      },
      {
        id: "walked",
        title: "Early correct dose, but she walks to the ambulance and nearly collapses; repeat given",
        reasoning: "partial",
        drive: (c) => {
          act(c, "look");
          act(c, "checkMed");
          act(c, "epinephrine", ADULT);
          act(c, "oxygen");
          at(c, 60);
          go(c, "walk");
          act(c, "flat");
          repeatWhenDue(c, ADULT, false);
          toEnd(c);
        },
      },
      {
        id: "noRepeat",
        title: "Early correct dose and good care, but no second dose when her pressure falls again",
        reasoning: "partial",
        drive: (c) => {
          act(c, "look");
          act(c, "checkMed");
          act(c, "epinephrine", ADULT);
          act(c, "flat");
          act(c, "oxygen");
          vitals(c);
          act(c, "requestAls");
          at(c, 150);
          go(c, "stretcher");
          until(c, (x) => v(x, "repeatDueAt") !== null || x.run.state.ended !== null);
          vitals(c);
          toEnd(c);
        },
      },
      {
        id: "noEpi",
        title: "Failure: treated as a mild reaction with her inhaler and watching; no epinephrine",
        reasoning: "missed",
        drive: (c) => {
          act(c, "look");
          act(c, "albuterol");
          act(c, "watch");
          vitals(c);
          act(c, "history");
          toEnd(c);
        },
      },
    ],
  };
}
