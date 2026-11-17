// REQ-311: golden paths for the PSM I Sprint that releases before the Review
// (PSMI/sprint-release-before-review.sim.json). No prototype exists, so the
// expectations are the engine's own results.
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "PSMI", slug: "sprint-release-before-review" };

function week(c: Ctl, release: string, friday: string, invite = true): void {
  if (invite) {
    c.act("kim");
    while (c.value("busy") === true) c.skip("work");
  }
  while (c.run.state.phase === "sprint" && !c.run.state.ended) {
    c.skip(c.value("day") === 5 && !c.run.state.openPrompt && c.value("lastDay") !== "none" ? "review" : "morning");
    if (c.run.state.openPrompt === "releasePrompt") c.choose(release);
    if (c.run.state.openPrompt === "fridayPrompt") c.choose(friday);
  }
}

function close(c: Ctl, how: string, pick: string): void {
  c.answer();
  c.act("reviewAct", { how });
  c.act("retroAct", { pick });
  c.act("close");
}

export function spec(): StepsSpec {
  return {
    slug: "sprint-release-before-review",
    paths: [
      { id: "expert", title: "Kim invited, the size filter released on Wednesday, the mobile chips returned, a working Review and one improvement at the cause", reasoning: "met",
        drive: (c) => { week(c, "now", "returned"); close(c, "working", "cause"); } },
      { id: "gated", title: "Everything held for the Review, which is run as a presentation", reasoning: "partial",
        drive: (c) => { week(c, "wait", "returned"); close(c, "presentation", "list"); } },
      { id: "stretched", title: "Released early, then the Sprint stretched to finish the chips", reasoning: "partial",
        drive: (c) => { week(c, "now", "extend"); close(c, "working", "cause"); } },
      { id: "showDone", title: "The failed chips shown as done at the Review", reasoning: "missed",
        drive: (c) => { week(c, "now", "showDone"); close(c, "working", "cause"); } },
      { id: "halfBuilt", title: "The half-built in-stock filter released with the Done one", reasoning: "missed",
        drive: (c) => { week(c, "withF2", "returned"); close(c, "working", "cause"); } },
      { id: "blame", title: "A sign-off Review and a Retrospective that looks for someone to blame", reasoning: "missed",
        drive: (c) => { week(c, "now", "returned", false); close(c, "signoff", "blame"); } },
      { id: "noKim", title: "Good calls on Done, but Kim never invited and the Retrospective skipped", reasoning: "partial",
        drive: (c) => { week(c, "now", "returned", false); close(c, "working", "skip"); } },
    ],
  };
}
