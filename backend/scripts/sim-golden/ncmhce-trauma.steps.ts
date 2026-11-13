// REQ-239: golden paths for the NCMHCE two-session case on a trauma-informed
// treatment plan (NCMHCE/ncmhce-trauma-treatment-plan.sim.json): the plan is
// built in session 1 and revised in session 2, three weeks later. No
// prototype exists, so the expectations are the engine's own results.
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NCMHCE", slug: "ncmhce-trauma-treatment-plan" };

const inSession = (c: Ctl): boolean => c.run.state.phase === "session1" || c.run.state.phase === "session2";

function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "choice"): void {
  c.act(action, params);
  if (c.run.state.openPrompt) c.choose(prediction);
  if (inSession(c) && !c.run.state.ended) c.skip("talk");
}

function all(c: Ctl, actions: (string | [string, Record<string, string>])[], prediction?: string): void {
  for (const a of actions) {
    if (typeof a === "string") ask(c, a, undefined, prediction);
    else ask(c, a[0], a[1], prediction);
  }
}

function close(c: Ctl, approach: string, risk: string): void {
  if (inSession(c)) c.act("endSession2");
  c.answer();
  c.act("document", { approach, risk });
}

const EXPERT_S1: (string | [string, Record<string, string>])[] = ["checkIn1", "psychoEducate", "groundingSkill", "offerChoice", ["setGoals", { who: "his" }], "askPeer", "askRisk1", "agreeMeasure", "reflect"];

export function spec(): StepsSpec {
  return {
    slug: "ncmhce-trauma-treatment-plan",
    paths: [
      {
        id: "expert",
        title: "Session 1: explain, ground, his choice of CPT, his goals, peer support, risk, a measure; session 2: risk asked at minute 3, the checklist reviewed, the plan revised together, his physician",
        reasoning: "met",
        drive: (c) => {
          all(c, EXPERT_S1);
          c.act("endSession1");
          all(c, ["checkIn2", "askRisk2", "reviewMeasure", ["revisePlan", { how: "adapt" }], "coordinate", "reflect"]);
          close(c, "tf", "assessed");
        },
      },
      {
        id: "imposed",
        title: "Prolonged exposure assigned and the goals written for him; risk asked at both sessions; revised without a baseline",
        reasoning: "partial",
        drive: (c) => {
          all(c, ["checkIn1", "assignTherapy", ["setGoals", { who: "mine" }], "askRisk1", "groundingSkill"]);
          c.act("endSession1");
          all(c, ["checkIn2", "askRisk2", "reviewMeasure", ["revisePlan", { how: "adapt" }]]);
          close(c, "tf", "assessed");
        },
      },
      {
        id: "pause",
        title: "A collaborative first session, then the trauma work stopped for supportive talk",
        reasoning: "partial",
        drive: (c) => {
          all(c, ["checkIn1", "psychoEducate", "offerChoice", ["setGoals", { who: "his" }], "askPeer", "askRisk1", "agreeMeasure"], "peer");
          c.act("endSession1");
          all(c, ["checkIn2", "askRisk2", ["revisePlan", { how: "pause" }]]);
          close(c, "support", "assessed");
        },
      },
      {
        id: "lateRisk",
        title: "A plan without grounding or a first risk check; in session 2 the risk question comes only at minute 21",
        reasoning: "partial",
        drive: (c) => {
          all(c, ["checkIn1", "psychoEducate", "offerChoice", ["setGoals", { who: "his" }], "agreeMeasure"]);
          c.act("endSession1");
          all(c, ["checkIn2", "reflect", "reflect", "reflect", "reflect", "reflect", "reviewMeasure", "coordinate", ["revisePlan", { how: "adapt" }], "askRisk2"]);
          close(c, "tf", "assessed");
        },
      },
      {
        id: "noReassess",
        title: "A strong first session; in session 2 blame for the worksheets, the plan pushed harder, no risk question",
        reasoning: "missed",
        drive: (c) => {
          all(c, EXPERT_S1);
          c.act("endSession1");
          all(c, ["checkIn2", "blameHomework", ["revisePlan", { how: "push" }]]);
          close(c, "tf", "unrecorded");
        },
      },
      {
        id: "rupture",
        title: "Pressed for the story of the call, then told which therapy he will do: he walks out",
        reasoning: "missed",
        drive: (c) => {
          all(c, ["pushDetail", "assignTherapy"]);
        },
      },
    ],
  };
}
