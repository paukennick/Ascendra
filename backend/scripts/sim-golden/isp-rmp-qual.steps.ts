// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for PMIRMP/stadium-roof-qualitative-analysis
// on the governance-board screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "PMIRMP", slug: "stadium-roof-qualitative-analysis" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Register and plan read; RBS; agreed matrix; urgency; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["register", "plan"] }, answers: { rbsPrompt: "rbsClass", matrixPrompt: "agreedMatrix", urgencyPrompt: "urgent" }, close: { how: "honest" } }) },
      { id: "partialRbs", title: "Partly right on classification, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["register"] }, answers: { rbsPrompt: "alpha", matrixPrompt: "agreedMatrix", urgencyPrompt: "urgent" }, close: { how: "honest" } }) },
      { id: "partialUrgency", title: "Partly right on urgency, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { rbsPrompt: "rbsClass", matrixPrompt: "agreedMatrix", urgencyPrompt: "scoreOnly" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { rbsPrompt: "alpha", matrixPrompt: "average", urgencyPrompt: "scoreOnly" }, close: { how: "honest" } }) },
      { id: "badRbs", title: "70 risks deleted on inconsistent scores", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["register", "plan"] }, answers: { rbsPrompt: "trim", matrixPrompt: "agreedMatrix", urgencyPrompt: "urgent" }, close: { how: "honest" } }) },
      { id: "badMatrix", title: "Risks ranked by the sponsor's feel", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["register", "plan"] }, answers: { rbsPrompt: "rbsClass", matrixPrompt: "gutFeel", urgencyPrompt: "urgent" }, close: { how: "honest" } }) },
      { id: "badUrgency", title: "Every red risk made top priority", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["register", "plan"] }, answers: { rbsPrompt: "rbsClass", matrixPrompt: "agreedMatrix", urgencyPrompt: "allHigh" }, close: { how: "honest" } }) },
    ],
  };
}
