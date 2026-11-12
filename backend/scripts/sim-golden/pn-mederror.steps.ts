// REQ-233 (bedside wave 1): golden paths for NCLEXPN/med-pass-error-caught.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps pn-mederror
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NCLEXPN", slug: "med-pass-error-caught" };

const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || x.run.state.ended !== null);
const toEnd = (c: Ctl): void => until(c, (x) => x.run.state.ended !== null, 20000);
function data(c: Ctl): void {
  c.act("apical");
  c.act("bp");
  teach(c);
  until(c, (x) => (x.value("apAt") !== null && x.value("bpAt") !== null) || x.run.state.ended !== null);
  c.answer();
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: cards against the MAR, two identifiers, apical pulse and BP, symptoms asked, two held and two given, RN, pharmacy, incident report in the system",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 10);
          c.act("mar");
          c.act("identify");
          c.act("allergies");
          data(c);
          c.act("ask");
          c.act("holdDig");
          c.act("holdMeto");
          c.act("giveFuro");
          c.act("giveK");
          c.act("report");
          c.act("pharmacy");
          teach(c);
          c.act("incident", { where: "system" });
          c.act("document");
          toEnd(c);
        },
      },
      {
        id: "chartedIncident",
        title: "Everything held and reported, but no pharmacy call and the incident written into the chart",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 30);
          c.act("identify");
          c.act("mar");
          data(c);
          c.act("holdDig");
          c.act("holdMeto");
          c.act("giveFuro");
          c.act("report");
          c.act("incident", { where: "chart" });
          toEnd(c);
        },
      },
      {
        id: "silentHold",
        title: "Catches the card and holds both, but tells no one and files nothing",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 30);
          c.act("identify");
          c.act("mar");
          data(c);
          c.act("holdDig");
          c.act("holdMeto");
          c.act("giveFuro");
          c.act("giveK");
          toEnd(c);
        },
      },
      {
        id: "holdEverything",
        title: "Catches everything and reports, but holds all four medications, including the two that were safe",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 20);
          c.act("mar");
          c.act("identify");
          data(c);
          c.act("ask");
          c.act("holdDig");
          c.act("holdMeto");
          c.act("report");
          c.act("pharmacy");
          c.act("incident", { where: "system" });
          toEnd(c);
        },
      },
      {
        id: "radialAndGive",
        title: "Failure: a 15-second radial pulse, no card check, everything given",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 30);
          c.act("identify");
          c.act("radial");
          c.act("giveDig");
          c.act("giveMeto");
          c.act("giveFuro");
          c.act("giveK");
          toEnd(c);
        },
      },
      {
        id: "wrongRobert",
        title: "Failure: calls 'Robert?' at the door and gives the furosemide to the man who answers",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 30);
          c.act("roomCall");
          c.act("giveFuro");
        },
      },
    ],
  };
}
