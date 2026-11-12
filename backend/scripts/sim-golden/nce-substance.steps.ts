// REQ-239: golden paths for the NCE client session on a court-referred
// substance use assessment (NCE/nce-substance-use-screen.sim.json). No
// prototype exists, so the expectations are the engine's own results.
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NCE", slug: "nce-substance-use-screen" };

function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "dependence"): void {
  c.act(action, params);
  if (c.run.state.openPrompt) c.choose(prediction);
  if (c.run.state.phase === "session" && !c.run.state.ended) c.skip("talk");
}

function close(c: Ctl, severity: string, plan: string, court = "release"): void {
  if (c.run.state.phase === "session") c.act("endSession");
  c.answer();
  c.act("document", { severity, plan, court });
}

export function spec(): StepsSpec {
  return {
    slug: "nce-substance-use-screen",
    paths: [
      {
        id: "expert",
        title: "Limits and the release first, a check-in and reflection, AUDIT, the withdrawal question at minute 17, other drugs, the criteria, a suicide screen, a medical withdrawal evaluation",
        reasoning: "met",
        drive: (c) => {
          ask(c, "limits");
          ask(c, "release");
          ask(c, "checkIn");
          ask(c, "reflect");
          ask(c, "audit");
          ask(c, "askQF");
          for (const a of ["askWithdrawal", "askOther", "askCriteria", "askSI", "explainMedical"]) ask(c, a);
          close(c, "severe", "medical");
        },
      },
      {
        id: "lateWithdrawal",
        title: "The screen first and the withdrawal question at minute 22; limits and the release only at the end; moderate, medical",
        reasoning: "partial",
        drive: (c) => {
          ask(c, "checkIn");
          ask(c, "reflect");
          ask(c, "audit", undefined, "hazardous");
          ask(c, "askQF");
          ask(c, "askCriteria");
          ask(c, "askOther");
          ask(c, "reflect");
          ask(c, "askSI");
          ask(c, "askWithdrawal");
          ask(c, "explainMedical");
          ask(c, "limits");
          ask(c, "release");
          close(c, "moderate", "medical");
        },
      },
      {
        id: "coldTurkey",
        title: "Limits and release, a short screen, then 'stop completely this weekend'; moderate, weekly outpatient",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "limits");
          ask(c, "release");
          ask(c, "checkIn");
          ask(c, "audit");
          ask(c, "askQF");
          ask(c, "coldTurkeyAdvice");
          close(c, "moderate", "outpatient");
        },
      },
      {
        id: "noRelease",
        title: "A good assessment and a safe recommendation, but the report goes to the court with no release signed",
        reasoning: "partial",
        drive: (c) => {
          ask(c, "checkIn");
          ask(c, "audit");
          ask(c, "askWithdrawal");
          ask(c, "askOther");
          ask(c, "askCriteria");
          ask(c, "explainMedical");
          close(c, "severe", "medical");
        },
      },
      {
        id: "classOnly",
        title: "Limits, a suicide screen, a label, then a DUI education class only",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "limits");
          ask(c, "release");
          ask(c, "checkIn");
          ask(c, "askSI");
          ask(c, "label");
          close(c, "mild", "education");
        },
      },
      {
        id: "rupture",
        title: "A label in the first minute: he walks out",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "label");
        },
      },
    ],
  };
}
