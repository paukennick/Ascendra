// REQ-321: golden paths for the PMP clinic fit-out on the project dashboard's
// predictive mode (PMP/pmp-clinic-fitout-schedule-variance.sim.json). No
// prototype exists, so the expectations are the engine's own results.
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "PMP", slug: "pmp-clinic-fitout-schedule-variance" };

const PROMPTS: Record<string, keyof Choices> = { sinkPrompt: "change", panelPrompt: "risk", reportPrompt: "report", claimPrompt: "claim" };
interface Choices { change: string; risk: string; report: string; claim: string; lessons: string; register?: boolean }

function project(c: Ctl, ch: Choices): void {
  if (ch.register) {
    c.act("register");
    while (c.value("busy") === true) c.skip("work");
  }
  while (c.run.state.phase === "build" && !c.run.state.ended) {
    c.skip("week");
    while (c.run.state.openPrompt) c.choose(ch[PROMPTS[c.run.state.openPrompt]] as string);
  }
  c.answer();
  c.act("closeOut", { how: ch.lessons });
  c.act("close");
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Register reviewed, the sinks through change control, R4's contingency on its trigger, an honest report with a recovery plan, the claim assessed, lessons recorded", reasoning: "met",
        drive: (c) => project(c, { register: true, change: "ccb", risk: "contingency", report: "honest", claim: "review", lessons: "held" }) },
      { id: "informalSinks", title: "The sponsor's sinks added on site outside change control; everything else controlled", reasoning: "partial",
        drive: (c) => project(c, { change: "informal", risk: "contingency", report: "honest", claim: "review", lessons: "held" }) },
      { id: "waited", title: "Waited past R4's trigger; the panel arrives two weeks late, reported honestly", reasoning: "partial",
        drive: (c) => project(c, { change: "ccb", risk: "wait", report: "honest", claim: "review", lessons: "held" }) },
      { id: "refused", title: "The sponsor refused without an analysis; otherwise controlled", reasoning: "partial",
        drive: (c) => project(c, { change: "refused", risk: "contingency", report: "honest", claim: "review", lessons: "held" }) },
      { id: "green", title: "Reported green while behind", reasoning: "missed",
        drive: (c) => project(c, { change: "ccb", risk: "contingency", report: "green", claim: "review", lessons: "held" }) },
      { id: "overrun", title: "Sinks added informally, the trigger ignored, the contractor blamed and the claim signed unread", reasoning: "missed",
        drive: (c) => project(c, { change: "informal", risk: "wait", report: "blame", claim: "signed", lessons: "skipped" }) },
      { id: "dispute", title: "An off-plan overtime crew, then the claim rejected unread and no lessons learned", reasoning: "missed",
        drive: (c) => project(c, { change: "ccb", risk: "crash", report: "honest", claim: "rejected", lessons: "skipped" }) },
    ],
  };
}
