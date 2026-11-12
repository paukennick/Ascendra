// REQ-239: golden paths for the NCMHCE suicide risk and safety planning case
// (NCMHCE/ncmhce-suicide-safety-plan.sim.json). No prototype exists, so the
// expectations are the engine's own results.
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NCMHCE", slug: "ncmhce-suicide-safety-plan" };

function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "today"): void {
  c.act(action, params);
  if (c.run.state.openPrompt) c.choose(prediction);
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

const CSSRS = ["askMethod", "askIntent", "askPlan", "askHistory", "askMeans"];

export function spec(): StepsSpec {
  return {
    slug: "ncmhce-suicide-safety-plan",
    paths: [
      {
        id: "expert",
        title: "The voicemail named, a reflection, normalizing, a direct question at minute 6, the C-SSRS follow-ups, a six-step plan ending with the pills, Jess involved, a call tomorrow",
        reasoning: "met",
        drive: (c) => {
          for (const a of ["checkIn", "reflect", "normalize", "askSI", ...CSSRS, "askReasons"]) ask(c, a);
          plan(c, ["warning", "coping", "distract", "people", "pros", "means"]);
          ask(c, "involveJess");
          ask(c, "followUp", { when: "call24" });
          close(c, "elevated", "outpatient");
        },
      },
      {
        id: "slowSafe",
        title: "Supportive talk and advice first, the direct question at minute 17, no past-behavior question, four plan steps, next week",
        reasoning: "partial",
        drive: (c) => {
          for (const a of ["checkIn", "reflect", "askReasons", "reflect", "reflect", "advise", "reflect", "normalize", "normalize", "normalize", "askSI", "askMethod", "askIntent", "askPlan", "askMeans"]) ask(c, a, undefined, "later");
          plan(c, ["means", "people", "pros", "warning"]);
          ask(c, "followUp", { when: "week" });
          close(c, "elevated", "outpatient");
        },
      },
      {
        id: "neverAsked",
        title: "Advice and a check-in, never the direct question; documented low risk, routine care in two weeks",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "checkIn");
          ask(c, "advise");
          ask(c, "askReasons");
          ask(c, "followUp", { when: "twoWeeks" });
          close(c, "low", "routine");
        },
      },
      {
        id: "contractEd",
        title: "A direct question too early (denied), a no-suicide contract, then an emergency referral",
        reasoning: "partial",
        drive: (c) => {
          ask(c, "askSI");
          ask(c, "contract");
          ask(c, "reflect");
          ask(c, "reflect");
          ask(c, "normalize");
          ask(c, "askSI");
          ask(c, "askMethod");
          ask(c, "recommendEd");
          ask(c, "followUp", { when: "week" });
          close(c, "imminent", "ed");
        },
      },
      {
        id: "planNoMeans",
        title: "A full assessment and a five-step plan, but the pills stay in the nightstand, and a contract",
        reasoning: "partial",
        drive: (c) => {
          for (const a of ["checkIn", "reflect", "normalize", "askSI", ...CSSRS, "askReasons"]) ask(c, a, undefined, "later");
          plan(c, ["warning", "coping", "distract", "people", "pros"]);
          ask(c, "contract");
          ask(c, "followUp", { when: "call24" });
          close(c, "elevated", "outpatient");
        },
      },
      {
        id: "rupture",
        title: "Minimizing and advice before any assessment: she walks out",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "reassure");
          ask(c, "advise");
        },
      },
    ],
  };
}
