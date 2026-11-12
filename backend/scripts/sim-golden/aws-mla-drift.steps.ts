// REQ-242 (AWS board sims, wave 2): golden paths for AWSMLA/fraud-model-drift,
// a learner-paced board case (no pacing commands). Expectations are the
// engine's own results, re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps aws-mla-drift
import type { Ctl, StepsSpec } from "./steps.ts";
import { week } from "./aws-board-helpers.ts";

export const ENTRY = { course: "AWSMLA", slug: "fraud-model-drift" };

function compare(c: Ctl, why: "right" | "wrong"): void {
  c.act("compareTraining");
  if (c.run.state.openPrompt) c.choose(why);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert: the evidence first, baseline from the training data, drift alarms, retrain on mature labels, v8 in shadow then promoted",
        reasoning: "met",
        drive: (c) => {
          c.act("monitorReport");
          compare(c, "right");
          c.act("labelsCheck");
          c.act("registry");
          c.act("rebaseline", { src: "training" });
          c.act("driftAlarm");
          c.act("retrain", { data: "mature" });
          c.act("deployV8", { mode: "shadow" });
          week(c);
        },
      },
      {
        id: "replaceGood",
        title: "Investigates and retrains well, but swaps v8 straight into production without a shadow test",
        reasoning: "partial",
        drive: (c) => {
          compare(c, "right");
          c.act("labelsCheck");
          c.act("rebaseline", { src: "training" });
          c.act("retrain", { data: "mature" });
          c.act("deployV8", { mode: "replace" });
          c.act("driftAlarm");
          week(c);
        },
      },
      {
        id: "blindRebaseline",
        title: "Rebuilds the baseline on a hunch before looking, then does the rest right but blames the monitor",
        reasoning: "partial",
        drive: (c) => {
          c.act("rebaseline", { src: "training" });
          compare(c, "wrong");
          c.act("labelsCheck");
          c.act("retrain", { data: "mature" });
          c.act("deployV8", { mode: "shadow" });
          week(c);
        },
      },
      {
        id: "recentShadow",
        title: "Failure: retrains on the last 30 days and re-baselines on yesterday's traffic; the shadow review stops v8, losses stay high",
        reasoning: "missed",
        drive: (c) => {
          compare(c, "right");
          c.act("labelsCheck");
          c.act("rebaseline", { src: "yesterday" });
          c.act("driftAlarm");
          c.act("retrain", { data: "recent30" });
          c.act("deployV8", { mode: "shadow" });
          week(c);
        },
      },
      {
        id: "shipRecent",
        title: "Failure: retrains on the last 30 days without looking and replaces v7 at once",
        reasoning: "missed",
        drive: (c) => {
          c.act("retrain", { data: "recent30" });
          c.act("deployV8", { mode: "replace" });
        },
      },
    ],
  };
}
