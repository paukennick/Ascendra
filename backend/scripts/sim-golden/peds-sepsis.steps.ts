// REQ-233 (bedside wave 1): golden paths for CCRNPEDS/pediatric-septic-shock-fluids.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps peds-sepsis
import type { Ctl, StepsSpec } from "./steps.ts";
import { at, pace, teach, until, v } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNPEDS", slug: "pediatric-septic-shock-fluids" };

const GOOD_CALL = { sit: "shock", bg: "full", asmt: "septic", rec: "come" };
const ROUTINE_CALL = { sit: "fever", bg: "min", asmt: "dry", rec: "more" };
const n = (c: Ctl, name: string): number => v(c, name) as number;
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || x.run.state.ended !== null);
const trace = (c: Ctl, tag: string): void => {
  if (process.env.SIM_TRACE) console.log(tag, c.run.state.tick, ["sbp", "hr", "crt", "deficit", "excess", "totalKg", "sev", "shock", "epiStep", "glucose", "spo2"].map((k) => `${k}=${JSON.stringify(c.value(k))}`).join(" "));
};

// Wait for the running bolus to finish, answering any teaching prompt on the way.
function bolusIn(c: Ctl): void {
  teach(c);
  until(c, (x) => v(x, "running") === false || x.run.state.ended !== null);
}

// Titrate epinephrine every 5 min to perfusion until the review.
function titrate(c: Ctl): void {
  while (!c.run.state.ended) {
    upTo(c, c.run.state.tick + 300);
    trace(c, "titrate");
    if (c.run.state.ended) break;
    if (v(c, "shock") === true && n(c, "epiStep") < 4) c.act("epi", { step: "up" });
    else if (n(c, "sbp") > 115 && n(c, "epiStep") > 1) c.act("epi", { step: "down" });
  }
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: glucose, culture, lactate, 20 mL/kg, early SBAR, antibiotics at 5 min, reassess after each bolus, stop at 40 mL/kg more, peripheral epinephrine on its own line",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          at(c, 20);
          c.act("look");
          c.act("glucose");
          c.act("cultures");
          c.act("lactate");
          c.act("bolus", { size: "20" });
          c.act("call", GOOD_CALL);
          teach(c);
          until(c, (x) => x.value("gluAt") !== null);
          teach(c);
          c.act("dextrose");
          c.act("line");
          until(c, (x) => x.value("culturesAt") !== null);
          c.act("abx");
          bolusIn(c);
          c.act("check");
          c.act("bolus", { size: "20" });
          bolusIn(c);
          c.act("check");
          until(c, (x) => x.value("refAt") !== null || x.value("shock") === false);
          c.act("epi", { step: "up" });
          titrate(c);
        },
      },
      {
        id: "slowSafe",
        title: "Slow but safe: 10 mL/kg boluses, one started without a check, the call at 25 min, antibiotics at 40 min, epinephrine late through the only IV",
        reasoning: "partial",
        drive: (c) => {
          at(c, 120);
          c.act("look");
          c.act("bolus", { size: "10" });
          bolusIn(c);
          c.act("bolus", { size: "10" });
          bolusIn(c);
          c.act("check");
          c.act("glucose");
          c.act("lactate");
          c.act("bolus", { size: "10" });
          at(c, 1500);
          c.act("call", GOOD_CALL);
          c.skip("callbackT");
          bolusIn(c);
          c.act("check");
          c.act("bolus", { size: "10" });
          c.act("cultures");
          c.skip("culturesT");
          c.act("dextrose");
          at(c, 2400);
          c.act("abx");
          bolusIn(c);
          c.act("check");
          upTo(c, (n(c, "refAt") ?? 2400) + 2400);
          c.act("epi", { step: "up" });
          titrate(c);
        },
      },
      {
        id: "blindFlood",
        title: "Antibiotics and the call on time, but 20 mL/kg boluses back to back without reassessing: pulmonary edema and a breathing tube",
        reasoning: "partial",
        drive: (c) => {
          at(c, 20);
          c.act("cultures");
          c.act("bolus", { size: "20" });
          c.act("call", GOOD_CALL);
          c.skip("culturesT");
          c.act("abx");
          for (let i = 0; i < 6 && v(c, "intubated") !== true && !c.run.state.ended; i++) {
            bolusIn(c);
            if (v(c, "intubated") !== true && !c.run.state.ended) c.act("bolus", { size: "20" });
          }
          until(c, (x) => v(x, "intubated") === true || x.run.state.ended !== null);
          c.act("epi", { step: "up" });
          titrate(c);
        },
      },
      {
        id: "fluidsOnly",
        title: "Antibiotics on time, boluses reassessed and stopped at the liver edge, but no vasoactive: still in shock at the review",
        reasoning: "partial",
        drive: (c) => {
          at(c, 30);
          c.act("glucose");
          c.act("cultures");
          c.act("lactate");
          c.act("bolus", { size: "20" });
          c.act("call", GOOD_CALL);
          c.skip("culturesT");
          c.act("abx");
          c.act("dextrose");
          c.act("line");
          bolusIn(c);
          c.act("check");
          c.act("bolus", { size: "20" });
          bolusIn(c);
          c.act("check");
          c.act("bolus", { size: "10" });
          bolusIn(c);
          c.act("check");
          until(c, (x) => x.run.state.ended !== null);
        },
      },
      {
        id: "noAntibiotic",
        title: "Failure: fluid only, a routine call, no culture, no antibiotics, no glucose or lactate",
        reasoning: "missed",
        drive: (c) => {
          at(c, 300);
          c.act("bolus", { size: "20" });
          bolusIn(c);
          c.act("check");
          at(c, 1800);
          c.act("call", ROUTINE_CALL);
          c.skip("callbackT");
          c.act("bolus", { size: "10" });
          until(c, (x) => x.run.state.ended !== null);
        },
      },
    ],
  };
}
