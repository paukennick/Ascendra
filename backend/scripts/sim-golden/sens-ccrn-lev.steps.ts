// REQ-329 (docs/sims.md 22.36): golden paths for CCRNADULT/sah-day-six-not-herself-on-levetiracetam.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps sens-ccrn-lev
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "CCRNADULT", slug: "sah-day-six-not-herself-on-levetiracetam" };

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
    slug: "sah-day-six-not-herself-on-levetiracetam",
    paths: [
      {
        id: "expert",
        title: "Eye level, a reflection, normalizing, the screen at minute 6, every follow-up, an attendant and a room check, the provider with the drug named, her husband",
        reasoning: "met",
        drive: (c) => drive(c, [["checkIn"], ["reflect"], ["normalize"], ["screen"], ["askNow"], ["askPlan"], ["askIntent"], ["askOnset"], ["askSupports"], ["observe", {"level": "constant"}], ["roomCheck"], ["notifyMd"], ["flagDrug"], ["husband"]], ["nonacute", "observeReview"]),
      },
      {
        id: "gaps",
        title: "An early screen, two follow-ups, checks every 15 minutes, the provider called, the drug never raised",
        reasoning: "partial",
        drive: (c) => drive(c, [["checkIn"], ["screen"], ["askNow"], ["askPlan"], ["askSupports"], ["observe", {"level": "checks"}], ["notifyMd"]], ["nonacute", "observeReview"]),
      },
      {
        id: "writtenOff",
        title: "Advice, a dose held without an order, the change charted as expected, never screened",
        reasoning: "missed",
        drive: (c) => drive(c, [["checkIn"], ["advise"], ["holdDose"], ["expected"]], ["negative", "routine"]),
      },
      {
        id: "rupture",
        title: "Cheerful reassurance and advice: she shuts down",
        reasoning: "missed",
        drive: (c) => drive(c, [["reassure"], ["advise"]]),
      },
    ],
  };
}
