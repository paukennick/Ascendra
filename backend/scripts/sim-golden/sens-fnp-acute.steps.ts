// REQ-329 (docs/sims.md 22.36): golden paths for FNPANCC/clinic-widower-thoughts-right-now.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps sens-fnp-acute
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "FNPANCC", slug: "clinic-widower-thoughts-right-now" };

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
    slug: "clinic-widower-thoughts-right-now",
    paths: [
      {
        id: "expert",
        title: "Asking what he means, a reflection, normalizing, the screen at minute 6, every follow-up, kept in sight, an ambulance with a call ahead, his son told",
        reasoning: "met",
        drive: (c) => drive(c, [["checkIn"], ["reflect"], ["normalize"], ["screen"], ["askNow"], ["askPlan"], ["askIntent"], ["askAccess"], ["askSupports"], ["stayWith"], ["transport"], ["callAhead"], ["callSon"]], ["acute", "emergency"]),
      },
      {
        id: "gaps",
        title: "An early screen, two follow-ups, an ambulance arranged but no one keeping him in sight, a call ahead, his son not told",
        reasoning: "partial",
        drive: (c) => drive(c, [["checkIn"], ["screen"], ["askNow"], ["askSupports"], ["transport"], ["callAhead"]], ["acute", "emergency"]),
      },
      {
        id: "nextWeek",
        title: "Advice, an antidepressant and a visit next week, never the screen",
        reasoning: "missed",
        drive: (c) => drive(c, [["checkIn"], ["advise"], ["planNextWeek"], ["driveSelf"]], ["negative", "outpatient"]),
      },
      {
        id: "rupture",
        title: "Telling him he would never do it, and advice: he leaves",
        reasoning: "missed",
        drive: (c) => drive(c, [["reassure"], ["advise"]]),
      },
    ],
  };
}
