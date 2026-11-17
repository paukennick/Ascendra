// REQ-311: golden paths for the PSM I Sprint whose Goal becomes obsolete
// (PSMI/sprint-goal-becomes-obsolete.sim.json). No prototype exists, so the
// expectations are the engine's own results.
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "PSMI", slug: "sprint-goal-becomes-obsolete" };

function act(c: Ctl, action: string): void {
  c.act(action);
  if (c.run.state.phase === "sprint" && !c.run.state.ended) c.skip("work");
}

// Monday's surprise, Tuesday's visit, Wednesday's notice: one answer each.
function week(c: Ctl, scope: string, dana: string, bank: string, talk = false): void {
  c.skip("surprise");
  c.choose(scope);
  c.skip("morning");
  c.skip("danaVisit");
  c.choose(dana);
  if (talk) act(c, "danaChat");
  c.skip("morning");
  c.choose(bank);
  while (c.run.state.phase === "sprint" && !c.run.state.ended) c.skip(c.value("day") === 5 ? "review" : "morning");
}

function close(c: Ctl, what: string): void {
  c.answer();
  c.act("undone", { what });
  c.act("close");
}

export function spec(): StepsSpec {
  return {
    slug: "sprint-goal-becomes-obsolete",
    paths: [
      { id: "expert", title: "Scope renegotiated with Maya, Dana sent to Maya and told how it works, Maya cancels the morning the Goal is obsolete, Done work kept", reasoning: "met",
        drive: (c) => { week(c, "negotiate", "toPO", "toPO", true); close(c, "review"); } },
      { id: "overtime", title: "Evenings instead of renegotiating scope; otherwise the right calls", reasoning: "partial",
        drive: (c) => { week(c, "push", "toPO", "toPO"); close(c, "review"); } },
      { id: "giftAdded", title: "Dana's request pulled into the Sprint round Maya; Maya still cancels", reasoning: "partial",
        drive: (c) => { week(c, "negotiate", "add", "toPO"); close(c, "review"); } },
      { id: "stretched", title: "The Sprint stretched by two days, then the work thrown away after Maya cancels", reasoning: "partial",
        drive: (c) => { week(c, "extend", "toPO", "toPO", true); close(c, "discard"); } },
      { id: "smCancels", title: "The Scrum Master cancels the Sprint", reasoning: "missed",
        drive: (c) => { week(c, "negotiate", "toPO", "smCancel"); close(c, "review"); } },
      { id: "keptBuilding", title: "The Sprint runs on toward an obsolete Goal until Friday", reasoning: "missed",
        drive: (c) => { week(c, "negotiate", "swap", "keep"); close(c, "review"); } },
      { id: "shipped", title: "Maya cancels, then the half-built redeem feature is released anyway", reasoning: "missed",
        drive: (c) => { week(c, "negotiate", "toPO", "toPO"); close(c, "ship"); } },
      { id: "qualityCut", title: "The review and accessibility check skipped to fit the bigger item", reasoning: "missed",
        drive: (c) => { week(c, "cutQuality", "toPO", "toPO"); close(c, "review"); } },
    ],
  };
}
