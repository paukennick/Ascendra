// REQ-225: golden paths for the EPPP client session on the duty to warn and
// protect (EPPP/duty-to-protect-threat.sim.json). No prototype exists, so the
// expectations are the engine's own results.
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "EPPP", slug: "duty-to-protect-threat" };

function ask(c: Ctl, action: string, params?: Record<string, string>): void {
  c.act(action, params);
  if (c.run.state.openPrompt) c.choose("victimPolice");
  if (c.run.state.phase === "session" && !c.run.state.ended) c.skip("talk");
}

function after(c: Ctl): void {
  if (c.run.state.phase === "session") c.act("endSession");
  c.answer();
}

export function spec(): StepsSpec {
  return {
    slug: "duty-to-protect-threat",
    paths: [
      {
        id: "expert",
        title: "Explore the remark by minute 7, assess weapon, history and drinking, rifle to his brother, tell him; consult, police and Kyle with the threat only",
        reasoning: "met",
        drive: (c) => {
          for (const a of ["limits", "checkIn", "reflect", "explore", "askMeans", "askHistory", "askSubstance", "deescalate", "reflect", "removeMeans", "tellClient"]) ask(c, a);
          after(c);
          c.act("consult");
          c.act("callPolice", { share: "threat" });
          c.act("warnVictim", { share: "threat" });
          c.act("document", { threat: "actual", actions: "both" });
        },
      },
      {
        id: "slowGaps",
        title: "Drinking first, the remark explored late, no talk with Evan about the calls, no consult",
        reasoning: "partial",
        drive: (c) => {
          for (const a of ["checkIn", "askSubstance", "reflect", "reflect", "explore", "askMeans", "askHistory"]) ask(c, a);
          after(c);
          c.act("callPolice", { share: "threat" });
          c.act("warnVictim", { share: "threat" });
          c.act("document", { threat: "actual", actions: "both" });
        },
      },
      {
        id: "premature",
        title: "Calls the police and Kyle on the first remark, before any assessment",
        reasoning: "partial",
        drive: (c) => {
          for (const a of ["limits", "checkIn", "reflect", "warnNow", "explore", "askMeans"]) ask(c, a);
          after(c);
          c.act("consult");
          c.act("document", { threat: "vague", actions: "both" });
        },
      },
      {
        id: "overShare",
        title: "A good assessment, then the police and Kyle are told his diagnosis and therapy",
        reasoning: "partial",
        drive: (c) => {
          for (const a of ["limits", "checkIn", "reflect", "explore", "askMeans", "askHistory", "tellClient"]) ask(c, a);
          after(c);
          c.act("callPolice", { share: "full" });
          c.act("warnVictim", { share: "full" });
          c.act("document", { threat: "actual", actions: "both" });
        },
      },
      {
        id: "noDuty",
        title: "A lecture, the remark never explored, nothing disclosed",
        reasoning: "missed",
        drive: (c) => {
          for (const a of ["checkIn", "lecture", "explore", "reflect"]) ask(c, a);
          after(c);
          c.act("document", { threat: "vague", actions: "nothing" });
        },
      },
      {
        id: "rupture",
        title: "Two lectures: he walks out",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "checkIn");
          ask(c, "lecture");
          ask(c, "lecture");
        },
      },
    ],
  };
}
