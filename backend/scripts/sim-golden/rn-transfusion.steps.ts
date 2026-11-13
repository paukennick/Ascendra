// REQ-233 (bedside wave 1): golden paths for NCLEXRN/post-op-transfusion-reaction.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps rn-transfusion
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NCLEXRN", slug: "post-op-transfusion-reaction" };

const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || x.run.state.ended !== null);
const toEnd = (c: Ctl): void => until(c, (x) => x.run.state.ended !== null, 20000);
const onset = (c: Ctl): void => until(c, (x) => x.value("onsetAt") !== null || x.run.state.ended !== null);

function prepare(c: Ctl, bedside = true): void {
  upTo(c, 10);
  c.act("verify");
  c.act("baseline");
  c.act("ivCheck");
  c.act("prime");
  if (bedside) {
    c.act("bedside");
    teach(c);
    c.skip("checkT");
  }
}

function respond(c: Ctl): void {
  c.act("newLine");
  c.act("vitals");
  c.act("callProvider");
  c.act("callBank");
  c.act("labels");
  c.act("samples");
  c.act("urine");
  teach(c);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: full pre-checks, slow start, stays, stops at the first sign, new tubing with saline, provider and blood bank, samples, urine",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          prepare(c);
          c.act("start", { speed: "slow" });
          c.act("stay");
          teach(c);
          onset(c);
          c.act("stop");
          c.answer();
          respond(c);
          c.act("vitals");
          toEnd(c);
        },
      },
      {
        id: "treatedAsFever",
        title: "Treats the chills as a febrile reaction for 4 minutes before stopping; the blood bank told late",
        reasoning: "partial",
        drive: (c) => {
          prepare(c);
          c.act("start", { speed: "slow" });
          onset(c);
          c.act("acetaminophen");
          upTo(c, c.run.state.tick + 240);
          c.act("stop");
          c.answer();
          c.act("newLine");
          c.act("callProvider");
          upTo(c, c.run.state.tick + 1200);
          c.act("callBank");
          c.act("samples");
          toEnd(c);
        },
      },
      {
        id: "leftTheRoom",
        title: "Full rate from the start, leaves the room; the reaction is found by the call light",
        reasoning: "met",
        drive: (c) => {
          prepare(c);
          c.act("start", { speed: "full" });
          c.act("leave");
          onset(c);
          until(c, (x) => x.value("away") === false);
          c.act("stop");
          c.answer();
          respond(c);
          toEnd(c);
        },
      },
      {
        id: "flushRestart",
        title: "Failure: no bedside check, stops, then flushes the blood line and restarts the unit once she settles",
        reasoning: "partial",
        drive: (c) => {
          prepare(c, false);
          c.act("start", { speed: "full" });
          onset(c);
          c.act("stop");
          c.answer();
          c.act("flush");
          c.act("callProvider");
          upTo(c, c.run.state.tick + 600);
          c.act("restart");
          toEnd(c);
        },
      },
      {
        id: "keptRunning",
        title: "Failure: diphenhydramine and a slower rate while the unit keeps running",
        reasoning: "missed",
        drive: (c) => {
          prepare(c);
          c.act("start", { speed: "full" });
          onset(c);
          c.act("antihistamine");
          c.act("slow");
          toEnd(c);
        },
      },
    ],
  };
}
