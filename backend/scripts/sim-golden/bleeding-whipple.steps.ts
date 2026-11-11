// REQ-223 (batch S2b): golden paths for CCRNADULT/bleeding-after-whipple.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test`.
//
//   npm run sim:golden -- steps bleeding-whipple
import type { Ctl, StepsSpec } from "./steps.ts";
import { at, begin, pace, teach, until, v } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNADULT", slug: "bleeding-after-whipple" };

const FULL = { sit: "bleed", bg: "full", asmt: "bleed", rec: "come" };

function afterCall(c: Ctl): void {
  until(c, (x) => v(x, "pendingCall") === false);
}

// Give whatever is at the bedside: the emergency units, then cooler pairs.
function transfuseAvailable(c: Ctl, product: "pair" | "rbc", max: number): void {
  if (v(c, "erArrived") === true && (v(c, "erLeft") as number) > 0) c.act("transfuse", { product: "er2" });
  let n = 0;
  while (v(c, "mtpArrived") === true && (v(c, "rbcStock") as number) > 0 && n++ < max) c.act("transfuse", { product });
}

function toTheOr(c: Ctl, product: "pair" | "rbc", calcium: boolean): void {
  let guard = 0;
  while (!c.run.state.ended && guard++ < 40) {
    until(c, (x) => x.run.state.ended !== null || (v(x, "erArrived") === true && (v(x, "erLeft") as number) > 0) || (v(x, "mtpArrived") === true && (v(x, "rbcStock") as number) > 4));
    if (c.run.state.ended) break;
    teach(c);
    transfuseAvailable(c, product, 2);
    if (calcium && (v(c, "rbcGiven") as number) + (v(c, "plasmaGiven") as number) >= 4 && v(c, "calciumAt") === null) c.act("calcium");
    teach(c);
  }
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert path at study pace: drains at 18:07, surgeon paged, blood and MTP early, 500 mL bridge, warmed, calcium",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          at(c, 420);
          c.act("look");
          c.act("drains");
          c.act("labs");
          teach(c);
          c.act("surgeon", FULL);
          afterCall(c);
          c.act("look");
          c.act("erBlood");
          teach(c);
          c.act("mtp");
          c.act("warm");
          c.act("crystalloid", { ml: "500" });
          teach(c);
          toTheOr(c, "pair", true);
        },
      },
      {
        id: "focused3x",
        title: "Focused start at 18:08, study pace, expert moves from there",
        reasoning: "met",
        drive: (c) => {
          begin(c);
          pace(c, 3);
          c.act("look");
          c.act("drains");
          c.act("surgeon", FULL);
          c.act("labs");
          afterCall(c);
          c.act("erBlood");
          c.act("mtp");
          c.act("warm");
          c.act("crystalloid", { ml: "500" });
          toTheOr(c, "pair", true);
        },
      },
      {
        id: "slowSafe",
        title: "Slow but safe: recognizes at 18:20, good SBAR, a full liter first, warming late",
        reasoning: "met",
        drive: (c) => {
          at(c, 1200);
          c.act("look");
          c.act("crystalloid", { ml: "1000" });
          at(c, 1240);
          c.act("drains");
          c.act("surgeon", FULL);
          afterCall(c);
          c.act("erBlood");
          c.act("mtp");
          c.act("labs");
          until(c, (x) => v(x, "erArrived") === true);
          c.act("transfuse", { product: "er2" });
          at(c, c.run.state.tick + 600);
          c.act("warm");
          toTheOr(c, "pair", true);
        },
      },
      {
        id: "phoneOrders",
        title: "Weak SBAR twice, 2.5 L of crystalloid and norepinephrine before blood, then a late effective call; red cells only, no calcium",
        reasoning: "partial",
        drive: (c) => {
          at(c, 900);
          c.act("look");
          c.act("surgeon", { sit: "soft", bg: "min", asmt: "dry", rec: "fluid" });
          afterCall(c);
          c.act("crystalloid", { ml: "1000" });
          at(c, 1800);
          c.act("surgeon", { sit: "soft", bg: "min", asmt: "unsure", rec: "pressor" });
          until(c, (x) => v(x, "pressorOrdered") === true);
          c.act("norepi", { dose: "0.1" });
          until(c, (x) => (v(x, "crystLeft") as number) <= 0);
          c.act("crystalloid", { ml: "1000" });
          until(c, (x) => (v(x, "crystLeft") as number) <= 0);
          c.act("crystalloid", { ml: "500" });
          until(c, (x) => x.run.state.ended !== null || x.run.state.tick >= 2900);
          c.act("drains");
          c.act("surgeon", FULL);
          afterCall(c);
          c.act("erBlood");
          c.act("mtp");
          toTheOr(c, "rbc", false);
        },
      },
      {
        id: "noCall",
        title: "Never calls: one liter of crystalloid and watching; arrest",
        reasoning: "missed",
        drive: (c) => {
          at(c, 1500);
          c.act("look");
          c.act("crystalloid", { ml: "1000" });
          until(c, (x) => x.run.state.ended !== null, 20000);
        },
      },
    ],
  };
}
