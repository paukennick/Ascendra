// REQ-282: golden paths for the NASM-CNC coaching session on a crash-diet
// request with signs of disordered eating
// (NASMCNC/cnc-crash-diet-request.sim.json). No prototype exists, so the
// expectations are the engine's own results.
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NASMCNC", slug: "cnc-crash-diet-request" };

// One exchange, then let the conversation continue (the session clock moves).
function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "refer"): void {
  c.act(action, params);
  if (c.run.state.openPrompt) c.choose(prediction);
  if (c.run.state.phase === "session" && !c.run.state.ended) c.skip("talk");
}

function close(c: Ctl, what: string): void {
  if (c.run.state.phase === "session") c.act("endSession");
  c.answer();
  c.act("document", { what });
}

export function spec(): StepsSpec {
  return {
    slug: "cnc-crash-diet-request",
    paths: [
      {
        id: "expert",
        title: "Open question, reflection, a 24-hour recall, running, feelings about eating; concern shared without a label and a referral she agrees to; weight goal paused; a full note",
        reasoning: "met",
        drive: (c) => {
          ask(c, "openQuestion");
          ask(c, "reflect");
          ask(c, "askDay");
          ask(c, "askExercise");
          ask(c, "askFeelings");
          ask(c, "refer");
          ask(c, "followUpPlan");
          close(c, "full");
        },
      },
      {
        id: "noFollowUp",
        title: "The pattern heard and a timely referral she agrees to, but no paused goal or check-in, and a one-line note",
        reasoning: "partial",
        drive: (c) => {
          ask(c, "openQuestion");
          ask(c, "reflect");
          ask(c, "askDay");
          ask(c, "askFeelings");
          ask(c, "refer");
          close(c, "brief");
        },
      },
      {
        id: "labeled",
        title: "The pattern heard, then 'this sounds like bulimia', then a referral she does not agree to",
        reasoning: "partial",
        drive: (c) => {
          ask(c, "openQuestion");
          ask(c, "reflect");
          ask(c, "askDay");
          ask(c, "askFeelings", undefined, "diagnose");
          ask(c, "labelIt");
          ask(c, "refer");
          close(c, "full");
        },
      },
      {
        id: "heardNoReferral",
        title: "The pattern heard, a reflection, and the session closed without a referral",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "openQuestion");
          ask(c, "reflect");
          ask(c, "askDay");
          ask(c, "askFeelings");
          ask(c, "reflect");
          close(c, "full");
        },
      },
      {
        id: "mealPlan",
        title: "The 1,000-calorie plan written on request; nothing documented",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "openQuestion");
          ask(c, "givePlan");
          close(c, "nothing");
        },
      },
      {
        id: "rupture",
        title: "A label, then a lecture: she walks out",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "labelIt");
          ask(c, "lecture");
        },
      },
      {
        id: "surface",
        title: "Open question, reflection and running only: the pattern never surfaces; a full note of what was said",
        reasoning: "partial",
        drive: (c) => {
          ask(c, "openQuestion");
          ask(c, "reflect");
          ask(c, "askExercise");
          close(c, "full");
        },
      },
    ],
  };
}
