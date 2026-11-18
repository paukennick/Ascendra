// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CSSGB/fmea-dispatch-takt-lean
// on the data screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CSSGB", slug: "fmea-dispatch-takt-lean" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Gemba and failures read; takt and constraint; RPNs; poka-yoke and re-score; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["gemba", "fails"] }, answers: { taktPrompt: "takt", rpnPrompt: "rpn", actPrompt: "pokayoke" }, close: { how: "honest" } }) },
      { id: "partialTakt", title: "Partly right on takt time, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["gemba"] }, answers: { taktPrompt: "labels", rpnPrompt: "rpn", actPrompt: "pokayoke" }, close: { how: "honest" } }) },
      { id: "partialAct", title: "Partly right on the action, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { taktPrompt: "takt", rpnPrompt: "rpn", actPrompt: "retrain" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { taktPrompt: "labels", rpnPrompt: "severityOnly", actPrompt: "retrain" }, close: { how: "honest" } }) },
      { id: "badTakt", title: "Daily overtime instead of balancing", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["gemba", "fails"] }, answers: { taktPrompt: "overtime", rpnPrompt: "rpn", actPrompt: "pokayoke" }, close: { how: "honest" } }) },
      { id: "badRpn", title: "The loudest complaint fixed first", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["gemba", "fails"] }, answers: { taktPrompt: "takt", rpnPrompt: "loudest", actPrompt: "pokayoke" }, close: { how: "honest" } }) },
      { id: "badAct", title: "Manual inspection of every parcel", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["gemba", "fails"] }, answers: { taktPrompt: "takt", rpnPrompt: "rpn", actPrompt: "inspectAll" }, close: { how: "honest" } }) },
    ],
  };
}
