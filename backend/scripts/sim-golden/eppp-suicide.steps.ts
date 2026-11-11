// REQ-225: golden paths for the EPPP client session on suicide risk
// (EPPP/suicide-risk-safety-plan.sim.json). No prototype exists, so the
// expectations are the engine's own results.
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "EPPP", slug: "suicide-risk-safety-plan" };

// One exchange, then let the conversation continue (the session clock moves).
function ask(c: Ctl, action: string, params?: Record<string, string>): void {
  c.act(action, params);
  if (c.run.state.openPrompt) c.choose("noRise");
  if (c.run.state.phase === "session" && !c.run.state.ended) c.skip("talk");
}

function plan(c: Ctl, steps: string[]): void {
  for (const s of steps) ask(c, "planStep", { step: s });
}

function close(c: Ctl, risk: string, disposition: string): void {
  if (c.run.state.phase === "session") c.act("endSession");
  c.answer();
  c.act("document", { risk, disposition });
}

export function spec(): StepsSpec {
  return {
    slug: "suicide-risk-safety-plan",
    paths: [
      {
        id: "expert",
        title: "Limits, check-in, reflection, a direct question by minute 9, the C-SSRS follow-ups, means, a six-step plan, a 48-hour check",
        reasoning: "met",
        drive: (c) => {
          ask(c, "limits");
          ask(c, "checkIn");
          ask(c, "reflect");
          ask(c, "askSI");
          for (const a of ["askMethod", "askIntent", "askPlan", "askHistory", "askMeans", "askSubstance", "askReasons"]) ask(c, a);
          plan(c, ["warning", "coping", "distract", "people", "pros", "means"]);
          ask(c, "followUp", { when: "call48" });
          close(c, "moderate", "outpatient");
        },
      },
      {
        id: "slowSafe",
        title: "Mood and drinking first, the direct question at minute 24, no past-behavior question, four plan steps, next week",
        reasoning: "partial",
        drive: (c) => {
          ask(c, "checkIn");
          ask(c, "askMood");
          ask(c, "askMood");
          ask(c, "askSubstance");
          ask(c, "reflect");
          ask(c, "askReasons");
          ask(c, "reflect");
          ask(c, "askSI");
          ask(c, "askMethod");
          ask(c, "askIntent");
          ask(c, "askPlan");
          ask(c, "askMeans");
          plan(c, ["means", "people", "pros", "warning"]);
          ask(c, "followUp", { when: "week" });
          ask(c, "limits");
          close(c, "moderate", "outpatient");
        },
      },
      {
        id: "neverAsked",
        title: "Advice and reassurance, never the direct question; documented low risk, routine care",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "checkIn");
          ask(c, "askMood");
          ask(c, "advise");
          ask(c, "askSubstance");
          ask(c, "followUp", { when: "month" });
          close(c, "low", "routine");
        },
      },
      {
        id: "contractEd",
        title: "A direct question too early (denied), a no-suicide contract, then an emergency referral",
        reasoning: "partial",
        drive: (c) => {
          ask(c, "askSI");
          ask(c, "limits");
          ask(c, "contract");
          ask(c, "reflect");
          ask(c, "reflect");
          ask(c, "askSI");
          ask(c, "askMethod");
          ask(c, "askIntent");
          ask(c, "recommendEd");
          ask(c, "reflect");
          ask(c, "followUp", { when: "week" });
          close(c, "high", "ed");
        },
      },
      {
        id: "rupture",
        title: "Minimizing and advice before any assessment: he walks out",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "askMood");
          ask(c, "reassure");
          ask(c, "advise");
        },
      },
    ],
  };
}
