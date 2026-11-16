// REQ-288: golden paths for the ASWB Clinical client session on suicide and
// violence risk (ASWBCLINICAL/aswbc-suicide-violence-risk.sim.json). No
// prototype exists, so the expectations are the engine's own results.
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "ASWBCLINICAL", slug: "aswbc-suicide-violence-risk" };

// One exchange, then let the conversation continue (the session clock moves).
function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "explore"): void {
  c.act(action, params);
  if (c.run.state.openPrompt) c.choose(prediction);
  if (c.run.state.phase === "session" && !c.run.state.ended) c.skip("talk");
}

const PLAN = ["warning", "coping", "distract", "people", "pros", "means"];

function close(c: Ctl, note: { risk: string; violence: string; disposition: string }): void {
  if (c.run.state.phase === "session") c.act("endSession");
  c.answer();
  c.act("document", note);
}

export function spec(): StepsSpec {
  return {
    slug: "aswbc-suicide-violence-risk",
    paths: [
      {
        id: "expert",
        title: "Asked directly at minute 5, the full screen, the remark about Gary explored, a six-step plan with the rifle to his brother, a call tomorrow, outpatient",
        reasoning: "met",
        drive: (c) => {
          ask(c, "checkIn");
          ask(c, "reflect");
          ask(c, "askSI");
          ask(c, "askMethod");
          ask(c, "askIntent");
          ask(c, "askPlan");
          ask(c, "askReasons");
          ask(c, "askHarm");
          ask(c, "askHistory");
          ask(c, "askAlcohol");
          for (const step of PLAN) ask(c, "planStep", { step });
          ask(c, "followUp", { when: "call24" });
          close(c, { risk: "elevated", violence: "low", disposition: "outpatient" });
        },
      },
      {
        id: "emergency",
        title: "The same assessment and plan, then an emergency evaluation instead of outpatient care",
        reasoning: "partial",
        drive: (c) => {
          ask(c, "checkIn");
          ask(c, "reflect");
          ask(c, "askSI");
          ask(c, "askMethod");
          ask(c, "askIntent");
          ask(c, "askPlan");
          ask(c, "askReasons");
          ask(c, "askHarm");
          ask(c, "askHistory");
          for (const step of PLAN) ask(c, "planStep", { step });
          ask(c, "followUp", { when: "call24" });
          close(c, { risk: "imminent", violence: "low", disposition: "ed" });
        },
      },
      {
        id: "lateAndThin",
        title: "Small talk first, the direct question at minute 23, past behavior asked before trust, a promise, three plan steps and next week",
        reasoning: "partial",
        drive: (c) => {
          ask(c, "checkIn", undefined, "warn");
          ask(c, "askAlcohol");
          ask(c, "askHistory");
          ask(c, "reflect");
          ask(c, "reflect");
          ask(c, "reflect");
          ask(c, "reflect");
          ask(c, "askHarm");
          ask(c, "askReasons");
          ask(c, "askSI");
          ask(c, "askMethod");
          ask(c, "askIntent");
          ask(c, "askPlan");
          ask(c, "contract");
          ask(c, "planStep", { step: "means" });
          ask(c, "planStep", { step: "people" });
          ask(c, "planStep", { step: "pros" });
          ask(c, "followUp", { when: "week" });
          close(c, { risk: "elevated", violence: "low", disposition: "outpatient" });
        },
      },
      {
        id: "breach",
        title: "Warm listening, then 'I'll have to notify Gary and the police', the suicide question never asked",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "checkIn", undefined, "warn");
          ask(c, "reflect");
          ask(c, "reflect");
          ask(c, "warnGary");
          ask(c, "followUp", { when: "week" });
          close(c, { risk: "low", violence: "threat", disposition: "routine" });
        },
      },
      {
        id: "unsafe",
        title: "Thoughts and the rifle found, nothing done about them, routine care",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "checkIn");
          ask(c, "askSI");
          ask(c, "askMethod");
          close(c, { risk: "low", violence: "low", disposition: "routine" });
        },
      },
      {
        id: "walkout",
        title: "A threat to disclose straight after the check-in, then blunt questions: he walks out",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "checkIn", undefined, "warn");
          ask(c, "warnGary");
          ask(c, "askSI");
          ask(c, "askHarm");
        },
      },
    ],
  };
}
