// REQ-232: golden paths for DPT/icu-early-mobility (the PT treatment
// session). No prototype exists, so the expectations are the engine's own
// results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps dpt-icu
import type { Ctl, StepsSpec } from "./steps.ts";
import { at, chapters, pace, teach, until, v } from "./s2b-helpers.ts";

export const ENTRY = { course: "DPT", slug: "icu-early-mobility" };

const num = (c: Ctl, name: string): number => v(c, name) as number;

// Past the written plan (it opens 30 s in and stops the clock).
function planned(c: Ctl): void {
  until(c, (x) => x.run.state.tick >= 7);
}

function finishInChair(c: Ctl): void {
  chapters(c);
  teach(c);
  c.skip("chairT");
  c.act("handover");
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert path at study pace: chart, screen, lines; staged up; sits her down as SpO2 nears 88%, breathing and oxygen, then marches and pivots to the chair",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          at(c, 2);
          c.act("chart");
          c.act("screen");
          c.act("lines");
          planned(c);
          c.act("toEdge");
          c.wait(90);
          c.act("stand");
          chapters(c);
          c.act("askRpe");
          c.wait(30);
          c.act("march");
          until(c, (x) => num(x, "spo2") < 89.5);
          c.act("sitRest");
          c.act("pursedLip");
          c.act("o2Up");
          teach(c);
          c.skip("rtT");
          c.skip("restT");
          c.act("stand");
          c.wait(60);
          c.act("march");
          c.act("askRpe");
          c.wait(90);
          c.act("pivot");
          finishInChair(c);
        },
      },
      {
        id: "slowSafe",
        title: "Screens but no chart; lines after sitting up; stands at once; keeps marching for about 2 min below 88% before resting and raising the oxygen; reaches the chair",
        reasoning: "partial",
        drive: (c) => {
          at(c, 2);
          c.act("screen");
          planned(c);
          c.act("toEdge");
          c.act("lines");
          c.wait(20);
          c.act("stand");
          chapters(c);
          c.act("march");
          c.act("askRpe");
          until(c, (x) => num(x, "curLow") >= 120);
          c.act("sitRest");
          c.act("o2Up");
          c.skip("rtT");
          c.skip("restT");
          c.act("stand");
          c.wait(30);
          c.act("march");
          c.wait(60);
          c.act("pivot");
          finishInChair(c);
        },
      },
      {
        id: "rhythmCalled",
        title: "Keeps her marching until a new fast irregular rhythm starts, then stops at once, calls the team and returns her to bed",
        reasoning: "partial",
        drive: (c) => {
          at(c, 2);
          c.act("screen");
          c.act("lines");
          planned(c);
          c.act("toEdge");
          c.wait(60);
          c.act("stand");
          chapters(c);
          c.act("askRpe");
          c.act("march");
          until(c, (x) => v(x, "afib") === true);
          c.act("escalate");
          c.act("sitRest");
          c.act("toBed");
          c.act("handover");
        },
      },
      {
        id: "ignoredAlarms",
        title: "No lines check; marches on through the low saturation and the new rhythm without calling anyone",
        reasoning: "missed",
        drive: (c) => {
          at(c, 2);
          c.act("screen");
          planned(c);
          c.act("toEdge");
          c.wait(60);
          c.act("stand");
          chapters(c);
          c.act("march");
          until(c, (x) => x.run.state.ended !== null, 5000);
        },
      },
      {
        id: "noScreen",
        title: "Chart and lines but no safety screen; brief march, rest, then the chair",
        reasoning: "partial",
        drive: (c) => {
          at(c, 2);
          c.act("chart");
          c.act("lines");
          planned(c);
          c.act("toEdge");
          c.wait(60);
          c.act("stand");
          chapters(c);
          c.act("askRpe");
          c.act("march");
          c.wait(20);
          c.act("sitRest");
          c.wait(60);
          c.act("stand");
          c.act("pivot");
          finishInChair(c);
        },
      },
      {
        id: "edgeOnly",
        title: "Screens and sits her at the edge of the bed, then puts her back to bed without standing",
        reasoning: "missed",
        drive: (c) => {
          at(c, 2);
          c.act("screen");
          c.act("lines");
          planned(c);
          c.act("toEdge");
          c.act("askRpe");
          c.wait(60);
          c.act("toBed");
          c.act("handover");
        },
      },
    ],
  };
}
