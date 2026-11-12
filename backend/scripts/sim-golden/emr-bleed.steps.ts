// REQ-241 (bedside wave 2, EMS): golden paths for
// NREMTEMR/thigh-bleed-tourniquet. No prototype exists, so the expectations
// are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps emr-bleed
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NREMTEMR", slug: "thigh-bleed-tourniquet" };

const v = (c: Ctl, n: string): unknown => c.value(n);
const toEnd = (c: Ctl): void => until(c, (x) => x.run.state.ended !== null, 20000);
const at = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || x.run.state.ended !== null);
const GOOD = { site: "above", tight: "stop" };
function tq(c: Ctl, p: Record<string, string>): void {
  c.act("tourniquet", p);
  teach(c);
  until(c, (x) => v(x, "applying") === false || x.run.state.ended !== null);
}
function second(c: Ctl): void {
  c.act("second");
  teach(c);
  until(c, (x) => v(x, "applying") === false || x.run.state.ended !== null);
}
function vitals(c: Ctl): void {
  c.act("vitals");
  teach(c);
  until(c, (x) => v(x, "vPending") === false || x.run.state.ended !== null);
}
function handover(c: Ctl, report: string): void {
  teach(c);
  until(c, (x) => v(x, "crewHere") === true || x.run.state.ended !== null);
  if (!c.run.state.ended) c.act("handoff", { report });
  toEnd(c);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: saw off, gloves, pressure at once, coworker holds it, tourniquet above the wound, a second, time written, paramedics, shock care, clean handoff",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          c.act("power");
          c.act("ppe");
          c.act("contact");
          c.act("pressure");
          c.act("coworker");
          tq(c, GOOD);
          second(c);
          c.act("markTime");
          c.act("requestAls");
          c.act("shockCare");
          vitals(c);
          handover(c, "full");
        },
      },
      {
        id: "selfApply",
        title: "Lets go of the wound to apply the tourniquet alone; one tourniquet, still oozing; no paramedics; a thin report",
        reasoning: "partial",
        drive: (c) => {
          c.act("power");
          c.act("ppe");
          c.act("contact");
          c.act("pressure");
          tq(c, GOOD);
          c.act("markTime");
          c.act("shockCare");
          vitals(c);
          handover(c, "vague");
        },
      },
      {
        id: "snugFirst",
        title: "Kneels by the running saw; a snug tourniquet makes it worse until it is tightened; second tourniquet, then a good handoff",
        reasoning: "partial",
        drive: (c) => {
          c.act("contact");
          c.act("power");
          c.act("ppe");
          c.act("pressure");
          c.act("coworker");
          tq(c, { site: "above", tight: "snug" });
          at(c, c.run.state.tick + 40);
          c.act("tighten");
          second(c);
          c.act("markTime");
          c.act("requestAls");
          c.act("shockCare");
          handover(c, "full");
        },
      },
      {
        id: "bandageFirst",
        title: "A pressure bandage first; the tourniquet only after 4 minutes, and water for his thirst",
        reasoning: "partial",
        drive: (c) => {
          c.act("power");
          c.act("ppe");
          c.act("contact");
          c.act("bandage");
          c.act("water");
          c.act("requestAls");
          at(c, 240);
          tq(c, GOOD);
          second(c);
          c.act("markTime");
          c.act("shockCare");
          handover(c, "full");
        },
      },
      {
        id: "loosened",
        title: "Failure: a good start, then the tourniquet is loosened when he begs, and nobody tightens it again",
        reasoning: "missed",
        drive: (c) => {
          c.act("power");
          c.act("ppe");
          c.act("contact");
          c.act("pressure");
          c.act("coworker");
          tq(c, GOOD);
          second(c);
          c.act("requestAls");
          c.act("shockCare");
          at(c, 200);
          c.act("loosen");
          handover(c, "full");
        },
      },
      {
        id: "wrongSite",
        title: "Failure: a tourniquet just above the knee, below the wound, and no direct pressure; he bleeds into class IV shock",
        reasoning: "missed",
        drive: (c) => {
          c.act("power");
          c.act("contact");
          tq(c, { site: "knee", tight: "stop" });
          c.act("shockCare");
          vitals(c);
          toEnd(c);
        },
      },
    ],
  };
}
