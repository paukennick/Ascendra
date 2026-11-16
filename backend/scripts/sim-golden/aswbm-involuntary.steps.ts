// REQ-288: golden paths for the ASWB Masters client session with a mandated
// client (ASWBMASTERS/aswbm-involuntary-engagement.sim.json). No prototype
// exists, so the expectations are the engine's own results.
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "ASWBMASTERS", slug: "aswbm-involuntary-engagement" };

// The prediction card opens as the session starts, so it is answered before the first move.
function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "reflect"): void {
  if (c.run.state.openPrompt) c.choose(prediction);
  c.act(action, params);
  if (c.run.state.openPrompt) c.choose(prediction);
  if (c.run.state.phase === "session" && !c.run.state.ended) c.skip("talk");
}

function close(c: Ctl, what: string, record: string): void {
  if (c.run.state.phase === "session") c.act("endSession");
  c.answer();
  c.act("reportOfficer", { what });
  c.act("document", { record });
}

function engage(c: Ctl): void {
  ask(c, "reflectSustain");
  ask(c, "explainRole");
  ask(c, "autonomy");
  ask(c, "askStory");
  ask(c, "askWants");
  ask(c, "partialize");
  ask(c, "measurable");
  ask(c, "contract");
}

export function spec(): StepsSpec {
  return {
    slug: "aswbm-involuntary-engagement",
    paths: [
      {
        id: "expert",
        title: "Reflect, the mandate and his choices at minute 2, autonomy, his story and his goals, partialized and measurable, his contract, attendance only",
        reasoning: "met",
        drive: (c) => {
          engage(c);
          close(c, "attendance", "full");
        },
      },
      {
        id: "lateConsent",
        title: "Rapport first, the mandate explained at minute 11, his goals but nothing measurable",
        reasoning: "partial",
        drive: (c) => {
          ask(c, "reflectSustain");
          ask(c, "autonomy");
          ask(c, "askStory");
          ask(c, "reflectSustain");
          ask(c, "reflectSustain");
          ask(c, "explainRole");
          ask(c, "askWants");
          ask(c, "partialize");
          ask(c, "contract");
          close(c, "attendance", "full");
        },
      },
      {
        id: "noConsent",
        title: "Warm and goal-focused, but the mandate, the release and his right to refuse are never explained",
        reasoning: "partial",
        drive: (c) => {
          ask(c, "reflectSustain");
          ask(c, "autonomy");
          ask(c, "reflectSustain");
          ask(c, "askWants");
          ask(c, "partialize");
          ask(c, "measurable");
          ask(c, "contract");
          close(c, "attendance", "full");
        },
      },
      {
        id: "compliance",
        title: "The mandate explained, then goals written for him and signed",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "explainRole", undefined, "persuade");
          ask(c, "imposeGoals");
          ask(c, "contract");
          close(c, "attendance", "brief");
        },
      },
      {
        id: "overshared",
        title: "A good session, a promised good report, then his story sent to the officer",
        reasoning: "partial",
        drive: (c) => {
          engage(c);
          ask(c, "promiseCourt");
          close(c, "content", "full");
        },
      },
      {
        id: "walkout",
        title: "A lecture, then a label: he walks out",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "lecture", undefined, "persuade");
          ask(c, "label");
        },
      },
    ],
  };
}
