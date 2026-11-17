// REQ-329 (docs/sims.md 22.36): golden paths for NCLEXRN/after-amputation-im-done.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps sens-rn-suicide
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NCLEXRN", slug: "after-amputation-im-done" };

function say(c: Ctl, action: string, params?: Record<string, string>): void {
  if (c.run.state.ended || c.run.state.phase !== "session") return;
  c.act(action, params);
  if (c.run.state.phase === "session" && !c.run.state.ended) c.skip("talk");
}

function close(c: Ctl, risk: string, disposition: string): void {
  if (c.run.state.ended) return;
  if (c.run.state.phase === "session") c.act("endSession");
  c.answer();
  c.act("document", { risk, disposition });
}

type Step = [string, Record<string, string>?];
function drive(c: Ctl, steps: Step[], doc?: [string, string]): void {
  for (const [a, p] of steps) say(c, a, p);
  if (doc) close(c, doc[0], doc[1]);
}

export function spec(): StepsSpec {
  return {
    slug: "after-amputation-im-done",
    paths: [
      {
        id: "expert",
        title: "Asking what he means, a reflection, normalizing, the screen at minute 6, every assessment question, constant observation and a room check, the provider and handoff",
        reasoning: "met",
        drive: (c) => drive(c, [["checkIn"], ["reflect"], ["normalize"], ["screen"], ["askNow"], ["askPlan"], ["askAccess"], ["askPast"], ["askState"], ["askSupports"], ["observe", {"level": "constant"}], ["roomCheck"], ["notifyMd"], ["handoff"]], ["acute", "observeHold"]),
      },
      {
        id: "gaps",
        title: "An early screen, two follow-ups, checks every 15 minutes, the provider called, no handoff",
        reasoning: "partial",
        drive: (c) => drive(c, [["checkIn"], ["screen"], ["askNow"], ["askPlan"], ["askSupports"], ["observe", {"level": "checks"}], ["notifyMd"]], ["acute", "observeHold"]),
      },
      {
        id: "neverScreened",
        title: "Advice and a promise, never the screen, left alone, discharge as planned",
        reasoning: "missed",
        drive: (c) => drive(c, [["checkIn"], ["advise"], ["contract"], ["leaveAlone"]], ["negative", "dischargePlan"]),
      },
      {
        id: "rupture",
        title: "Cheerful predictions and advice: he shuts down",
        reasoning: "missed",
        drive: (c) => drive(c, [["reassure"], ["advise"]]),
      },
    ],
  };
}
