// REQ-282: golden paths for the NASM-CNC coaching session on a greens powder,
// a blood thinner and a supplement label
// (NASMCNC/cnc-greens-powder-warfarin.sim.json). No prototype exists, so the
// expectations are the engine's own results.
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NASMCNC", slug: "cnc-greens-powder-warfarin" };

function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "steady"): void {
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
    slug: "cnc-greens-powder-warfarin",
    paths: [
      {
        id: "expert",
        title: "Open question, warfarin confirmed, the label read (disease claim, no seal), the powder sent to her clinic, importance ruler, a SMART lunch goal, a full note",
        reasoning: "met",
        drive: (c) => {
          ask(c, "openQuestion");
          ask(c, "askMeds");
          ask(c, "readLabel");
          ask(c, "pointClaim");
          ask(c, "askSeal");
          ask(c, "refer");
          ask(c, "askScale");
          ask(c, "setGoal", { pick: "smart" });
          close(c, "full");
        },
      },
      {
        id: "partialLabel",
        title: "Warfarin confirmed, the claim spotted but no seal check, the powder sent to her clinic in time, 'eat healthier', a one-line note",
        reasoning: "partial",
        drive: (c) => {
          ask(c, "openQuestion");
          ask(c, "askMeds");
          ask(c, "readLabel", undefined, "avoid");
          ask(c, "pointClaim");
          ask(c, "refer");
          ask(c, "setGoal", { pick: "vague" });
          close(c, "brief");
        },
      },
      {
        id: "lateCheck",
        title: "The label read, the clinic suggested before knowing why, warfarin learned after; 'eat healthier'; a one-line note",
        reasoning: "partial",
        drive: (c) => {
          ask(c, "openQuestion");
          ask(c, "readLabel");
          ask(c, "refer");
          ask(c, "askMeds", undefined, "avoid");
          ask(c, "setGoal", { pick: "vague" });
          close(c, "brief");
        },
      },
      {
        id: "endorse",
        title: "Warfarin confirmed, then 'go ahead, and add a kale smoothie'; nothing documented",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "openQuestion");
          ask(c, "askMeds");
          ask(c, "endorse");
          close(c, "nothing");
        },
      },
      {
        id: "cutGreens",
        title: "Warfarin confirmed, 'stop eating greens', 'powders are a scam', the label read; a one-line note",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "openQuestion");
          ask(c, "askMeds");
          ask(c, "cutGreens");
          ask(c, "dismiss");
          ask(c, "readLabel", undefined, "avoid");
          close(c, "brief");
        },
      },
      {
        id: "unchecked",
        title: "Rapport and motivation only: the blood thinner never asked about, an outcome goal, a full note",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "openQuestion");
          ask(c, "reflect");
          ask(c, "askScale");
          ask(c, "setGoal", { pick: "outcome" });
          close(c, "full");
        },
      },
    ],
  };
}
