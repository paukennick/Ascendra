// REQ-232: golden paths for DPT/tka-gait-dvt-red-flag (the PT treatment
// session, two visits). No prototype exists, so the expectations are the
// engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps dpt-tka
import type { Ctl, StepsSpec } from "./steps.ts";
import { at, chapters, pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "DPT", slug: "tka-gait-dvt-red-flag" };

// Past the written plan (it opens 30 s into Monday's visit and stops the clock).
function planned(c: Ctl): void {
  until(c, (x) => x.run.state.tick >= 4);
}

function toThursday(c: Ctl): void {
  c.act("endVisit1");
  c.skip("daysT");
  chapters(c);
}

// Monday as the guideline has it: measures, strong NMES, ROM and strengthening,
// walking with RPE checks and a cane trial.
function fullMonday(c: Ctl, girth = true): void {
  at(c, 2);
  c.act("askHistory");
  c.act("measureRom");
  c.act("measureQuad");
  if (girth) c.act("measureGirth");
  c.act("palpateCalf");
  planned(c);
  c.act("nmes", { dose: "high" });
  c.wait(600);
  c.act("romEx");
  c.wait(180);
  c.act("strength");
  c.wait(240);
  c.act("gaitWalker");
  c.wait(60);
  c.act("askRpe");
  c.wait(120);
  c.act("gaitCane");
  c.wait(120);
  c.act("sitDown");
  c.wait(60);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert path at study pace: Monday measured and progressed with guideline doses; Thursday screened first, Wells 4, same-day call to the surgeon, warning signs taught",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          fullMonday(c);
          toThursday(c);
          c.act("askHistory");
          c.act("measureGirth");
          c.act("palpateCalf");
          c.act("wells", { alt: "no" });
          c.act("callSurgeon");
          c.act("educate");
          c.act("endVisit2");
        },
      },
      {
        id: "slowSafe",
        title: "Monday: ROM only, sensory-level NMES, walker; Thursday: asks first, palpates, scores Wells as post-operative swelling, and tells him to call his surgeon himself",
        reasoning: "partial",
        drive: (c) => {
          at(c, 2);
          c.act("measureRom");
          planned(c);
          c.act("nmes", { dose: "low" });
          c.wait(600);
          c.act("romEx");
          c.wait(180);
          c.act("gaitWalker");
          c.wait(60);
          c.act("askRpe");
          c.wait(120);
          c.act("sitDown");
          toThursday(c);
          c.act("askHistory");
          c.act("palpateCalf");
          c.act("wells", { alt: "yes" });
          c.act("tellHimCall");
          c.act("educate");
          c.act("endVisit2");
        },
      },
      {
        id: "peCaught",
        title: "Thursday: straight into walking without a screen; keeps going after the calf complaint; a lung clot; 911 at once",
        reasoning: "partial",
        drive: (c) => {
          fullMonday(c, false);
          toThursday(c);
          c.act("gaitWalker");
          c.wait(120);
          c.act("strength");
          until(c, (x) => x.run.state.ended !== null || x.value("pe") === true);
          c.wait(20);
          c.act("call911");
          teach(c);
          c.skip("emsT");
        },
      },
      {
        id: "peMissed",
        title: "Thursday: exercises without asking about or examining the calf; a lung clot and no 911 call",
        reasoning: "missed",
        drive: (c) => {
          fullMonday(c);
          toThursday(c);
          c.act("romEx");
          c.wait(300);
          c.act("strength");
          until(c, (x) => x.run.state.ended !== null, 5000);
        },
      },
      {
        id: "massageHome",
        title: "Monday: nothing measured, home program only; Thursday: hears about the calf, massages it as a cramp, exercises and sends him home",
        reasoning: "missed",
        drive: (c) => {
          at(c, 2);
          planned(c);
          c.wait(120);
          toThursday(c);
          c.act("askHistory");
          c.act("massage");
          c.act("romEx");
          c.wait(120);
          c.act("endVisit2");
        },
      },
      {
        id: "cpmNoRehab",
        title: "Monday: CPM recommended and strong NMES, but no exercise or walking; Thursday handled as the expert would",
        reasoning: "partial",
        drive: (c) => {
          at(c, 2);
          c.act("askHistory");
          c.act("measureRom");
          c.act("measureQuad");
          c.act("measureGirth");
          planned(c);
          c.act("nmes", { dose: "high" });
          c.wait(600);
          c.act("adviseCpm");
          toThursday(c);
          c.act("askHistory");
          c.act("measureGirth");
          c.act("palpateCalf");
          c.act("wells", { alt: "no" });
          c.act("callSurgeon");
          c.act("educate");
          c.act("endVisit2");
        },
      },
    ],
  };
}
