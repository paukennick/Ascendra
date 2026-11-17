// REQ-329 (docs/sims.md 22.36): golden paths for PCCN/new-heart-failure-better-off-without-me.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps sens-pccn-si
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "PCCN", slug: "new-heart-failure-better-off-without-me" };

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
    slug: "new-heart-failure-better-off-without-me",
    paths: [
      {
        id: "expert",
        title: "Sitting down, a reflection, normalizing, the screen at minute 6, every follow-up, an attendant and a room check, the provider and the handoff, her daughter",
        reasoning: "met",
        drive: (c) => drive(c, [["checkIn"], ["reflect"], ["normalize"], ["screen"], ["askNow"], ["askPlan"], ["askIntent"], ["askMood"], ["askSupports"], ["observe", {"level": "constant"}], ["roomCheck"], ["notifyMd"], ["handoff"], ["daughter"]], ["nonacute", "attendant"]),
      },
      {
        id: "gaps",
        title: "An early screen, two follow-ups, checks every 15 minutes, the provider called, no handoff",
        reasoning: "partial",
        drive: (c) => drive(c, [["checkIn"], ["screen"], ["askNow"], ["askPlan"], ["askSupports"], ["observe", {"level": "checks"}], ["notifyMd"]], ["nonacute", "attendant"]),
      },
      {
        id: "leftForDay",
        title: "A promise, 'low mood' charted for the day team, never screened, routine care",
        reasoning: "missed",
        drive: (c) => drive(c, [["checkIn"], ["advise"], ["contract"], ["chartOnly"]], ["negative", "routine"]),
      },
      {
        id: "rupture",
        title: "False cheer and advice before any screen: she shuts down",
        reasoning: "missed",
        drive: (c) => drive(c, [["reassure"], ["advise"]]),
      },
    ],
  };
}
