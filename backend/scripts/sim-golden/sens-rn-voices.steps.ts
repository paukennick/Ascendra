// REQ-329 (docs/sims.md 22.36): golden paths for NCLEXRN/voices-say-he-should-die.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps sens-rn-voices
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NCLEXRN", slug: "voices-say-he-should-die" };

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
    slug: "voices-say-he-should-die",
    paths: [
      {
        id: "expert",
        title: "Calm and simple, a reflection, reality presented gently, the screen at minute 6, every follow-up, observation and a room check, low stimulation, the provider and handoff",
        reasoning: "met",
        drive: (c) => drive(c, [["checkIn"], ["reflect"], ["normalize"], ["screen"], ["askNow"], ["askCommand"], ["askOrient"], ["askSubstances"], ["askSupports"], ["observe", {"level": "constant"}], ["roomCheck"], ["lowStim"], ["notifyMd"], ["handoff"]], ["acute", "observeConsult"]),
      },
      {
        id: "gaps",
        title: "An early screen, two follow-ups, checks every 15 minutes, the provider called, no handoff",
        reasoning: "partial",
        drive: (c) => drive(c, [["checkIn"], ["screen"], ["askNow"], ["askCommand"], ["askSupports"], ["observe", {"level": "checks"}], ["notifyMd"]], ["acute", "observeConsult"]),
      },
      {
        id: "argueAndLeave",
        title: "Arguing with the voices, advice, left alone, never screened",
        reasoning: "missed",
        drive: (c) => drive(c, [["checkIn"], ["argue"], ["advise"], ["leaveAlone"]], ["negative", "routine"]),
      },
      {
        id: "rupture",
        title: "'You're just tired' and advice: he withdraws",
        reasoning: "missed",
        drive: (c) => drive(c, [["reassure"], ["advise"]]),
      },
    ],
  };
}
