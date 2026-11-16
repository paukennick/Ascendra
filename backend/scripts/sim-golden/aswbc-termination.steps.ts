// REQ-289: golden paths for the ASWB Clinical client session on ending services
// for nonpayment (ASWBCLINICAL/aswbc-termination-nonpayment.sim.json). No
// prototype exists, so the expectations are the engine's own results. Exported
// for the ASWB Masters band of the same session.
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "ASWBCLINICAL", slug: "aswbc-termination-nonpayment" };

function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "three"): void {
  if (c.run.state.openPrompt) c.choose(prediction);
  c.act(action, params);
  if (c.run.state.openPrompt) c.choose(prediction);
  if (c.run.state.phase === "session" && !c.run.state.ended) c.skip("talk");
}

function close(c: Ctl, what: string, record: string): void {
  if (c.run.state.phase === "session") c.act("endSession");
  c.answer();
  c.act("letter", { what });
  c.act("document", { record });
}

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Check-in, the agreement reviewed, a risk screen at minute 7, progress, options, closing sessions and a warm handoff with a release, a letter with the plan",
      reasoning: "met",
      drive: (c) => {
        ask(c, "checkIn");
        ask(c, "reflect");
        ask(c, "reviewArrangement");
        ask(c, "screenRisk");
        ask(c, "progress");
        ask(c, "exploreOptions");
        ask(c, "agreePlan", { pick: "transfer" });
        ask(c, "consent");
        close(c, "plan", "full");
      },
    },
    {
      id: "noRelease",
      title: "The same, but the risk screen at minute 21 and no release for the handoff",
      reasoning: "partial",
      drive: (c) => {
        ask(c, "checkIn");
        ask(c, "reflect");
        ask(c, "reviewArrangement");
        ask(c, "progress");
        ask(c, "exploreOptions");
        ask(c, "reflect");
        ask(c, "reflect");
        ask(c, "reflect");
        ask(c, "screenRisk");
        ask(c, "agreePlan", { pick: "transfer" });
        close(c, "plan", "brief");
      },
    },
    {
      id: "waived",
      title: "No review of the agreement or his goals: the balance waived and free sessions open-ended",
      reasoning: "partial",
      drive: (c) => {
        ask(c, "checkIn", undefined, "balance");
        ask(c, "reflect");
        ask(c, "screenRisk");
        ask(c, "agreePlan", { pick: "waive" });
        close(c, "plan", "full");
      },
    },
    {
      id: "endedToday",
      title: "The agreement reviewed, no risk screen, today is the last session, collections letter",
      reasoning: "missed",
      drive: (c) => {
        ask(c, "checkIn", undefined, "balance");
        ask(c, "reviewArrangement");
        ask(c, "agreePlan", { pick: "today" });
        close(c, "collections", "brief");
      },
    },
    {
      id: "walkout",
      title: "Payment demanded, then today is the last session: he walks out",
      reasoning: "missed",
      drive: (c) => {
        ask(c, "demand", undefined, "balance");
        ask(c, "agreePlan", { pick: "today" });
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
