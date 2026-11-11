// REQ-222 (batch S2a): golden paths for CCRNADULT/sepsis-to-septic-shock.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps sepsis
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "CCRNADULT", slug: "sepsis-to-septic-shock" };

const n = (c: Ctl, name: string): number => c.value(name) as number;
const isSet = (c: Ctl, name: string): boolean => c.value(name) !== null;

const GOOD_CALL = { sit: "shock", bg: "full", asmt: "septic", rec: "come" };
const ROUTINE_CALL = { sit: "fever", bg: "min", asmt: "dry", rec: "fluid" };

// Real time until `at` (seconds of sim time), answering the reasoning moment.
function until(c: Ctl, at: number): void {
  if (c.run.state.tick < at) c.wait(at - c.run.state.tick);
}

// Titrate norepinephrine every 5 min toward MAP 65-80 until the review.
function titrateToReview(c: Ctl, start: number): void {
  const doses = ["0.05", "0.1", "0.15", "0.2", "0.3"];
  let i = doses.indexOf(String(start));
  let lactateRepeated = false;
  while (!c.run.state.ended) {
    c.wait(300);
    if (c.run.state.ended) break;
    if (!lactateRepeated && isSet(c, "lacFirstAt") && c.run.state.tick >= n(c, "lacFirstAt") + 7200) {
      c.act("lactate");
      c.skip("lacResultT");
      lactateRepeated = true;
    }
    const map = n(c, "map");
    if (map < 67 && i < doses.length - 1) c.act("norepi", { dose: doses[++i] });
    else if (map > 82 && i > 0) c.act("norepi", { dose: doses[--i] });
  }
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert: cultures then antibiotic within minutes, 30 mL/kg, early SBAR, peripheral norepinephrine, repeat lactate at 2 h",
        reasoning: "met",
        drive: (c) => {
          until(c, 30);
          c.act("look");
          c.act("cultures");
          c.act("lactate");
          c.act("bolus", { ml: "1000" });
          until(c, 90);
          c.act("bolus", { ml: "1000" });
          c.act("call", GOOD_CALL);
          c.act("source");
          c.skip("culturesT");
          c.waitUntil(() => isSet(c, "culturesAt"));
          c.act("abx");
          c.waitUntil((r) => r.state.vars.hypoAt !== null || n(c, "map") < 67);
          c.act("norepi", { dose: "0.1" });
          titrateToReview(c, 0.1);
        },
      },
      {
        id: "slowSafe",
        title: "Slow but safe: antibiotic at 45 min, the call 20 min after the first low MAP, norepinephrine late",
        reasoning: "partial",
        drive: (c) => {
          until(c, 120);
          c.act("look");
          c.act("bolus", { ml: "500" });
          until(c, 600);
          c.act("lactate");
          c.act("cultures");
          c.act("bolus", { ml: "1000" });
          until(c, 2700);
          c.act("abx");
          c.act("bolus", { ml: "500" });
          c.waitUntil((r) => r.state.vars.hypoAt !== null);
          c.wait(1200);
          c.act("call", GOOD_CALL);
          c.skip("callbackT");
          c.wait(1500);
          c.act("norepi", { dose: "0.15" });
          titrateToReview(c, 0.15);
        },
      },
      {
        id: "noAntibiotic",
        title: "Failure: fluids only, a routine call, no cultures, no antibiotic, no lactate",
        reasoning: "missed",
        drive: (c) => {
          until(c, 300);
          c.act("bolus", { ml: "1000" });
          until(c, 1800);
          c.act("call", ROUTINE_CALL);
          c.skip("callbackT");
          c.act("bolus", { ml: "1000" });
          c.waitUntil((r) => r.state.ended !== null && r.state.ended !== undefined && r.state.ended !== false);
        },
      },
      {
        id: "lateAntibioticCentralLine",
        title: "Failure: antibiotic at 100 min, no extra fluid, norepinephrine only through a central line",
        reasoning: "partial",
        drive: (c) => {
          until(c, 600);
          c.act("look");
          c.act("lactate");
          c.waitUntil((r) => r.state.vars.hypoAt !== null);
          c.wait(600);
          c.act("call", GOOD_CALL);
          c.skip("callbackT");
          c.act("line");
          c.skip("lineT");
          c.act("norepi", { dose: "0.2" });
          until(c, 6000);
          c.act("cultures");
          c.skip("culturesT");
          c.act("abx");
          titrateToReview(c, 0.2);
        },
      },
      {
        id: "fluidOverload",
        title: "On time, but six more litres of fluid: pulmonary edema and a breathing tube",
        reasoning: "met",
        drive: (c) => {
          until(c, 30);
          c.act("look");
          c.act("cultures");
          c.act("lactate");
          c.act("bolus", { ml: "1000" });
          c.act("bolus", { ml: "1000" });
          c.act("call", GOOD_CALL);
          c.act("source");
          c.skip("culturesT");
          c.waitUntil(() => isSet(c, "culturesAt"));
          c.act("abx");
          c.waitUntil((r) => r.state.vars.hypoAt !== null || n(c, "map") < 67);
          c.act("norepi", { dose: "0.1" });
          while (c.run.state.vars.intubated !== true) {
            c.waitUntil((r) => (r.state.vars.nRunning as number) < 2 || r.state.vars.intubated === true);
            if (c.run.state.vars.intubated !== true) c.act("bolus", { ml: "1000" });
          }
          titrateToReview(c, 0.1);
        },
      },
    ],
  };
}
