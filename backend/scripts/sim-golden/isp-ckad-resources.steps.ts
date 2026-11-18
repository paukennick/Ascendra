// REQ-336 (depth-infra-sec-pm, docs/sims.md 22.40): golden paths for CKAD/quota-rejects-new-pods-oomkilled
// on the terminal screen. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { play } from "./pm2-helpers.ts";

export const ENTRY = { course: "CKAD", slug: "quota-rejects-new-pods-oomkilled" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Events, quota and last state read; requests sized; limit raised to the peak; Guaranteed QoS; an honest record", reasoning: "met",
        drive: (c) => play(c, { inspect: { 0: ["events", "oom"] }, answers: { reqPrompt: "size", memPrompt: "fit", qosPrompt: "guaranteed" }, close: { how: "honest" } }) },
      { id: "partialReq", title: "Partly right on the new worker, the rest on plan", reasoning: "partial",
        drive: (c) => play(c, { inspect: { 0: ["events"] }, answers: { reqPrompt: "askQuota", memPrompt: "fit", qosPrompt: "guaranteed" }, close: { how: "honest" } }) },
      { id: "partialQos", title: "Partly right on the payment API's QoS, and a one-line record", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { reqPrompt: "size", memPrompt: "fit", qosPrompt: "burstable" }, close: { how: "summary" } }) },
      { id: "allPartial", title: "Every decision only partly right", reasoning: "partial",
        drive: (c) => play(c, { inspect: {}, answers: { reqPrompt: "askQuota", memPrompt: "restartPolicy", qosPrompt: "burstable" }, close: { how: "honest" } }) },
      { id: "badReq", title: "Token requests to slip past the quota", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["events", "oom"] }, answers: { reqPrompt: "tiny", memPrompt: "fit", qosPrompt: "guaranteed" }, close: { how: "honest" } }) },
      { id: "badMem", title: "The memory limit removed", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["events", "oom"] }, answers: { reqPrompt: "size", memPrompt: "noLimit", qosPrompt: "guaranteed" }, close: { how: "honest" } }) },
      { id: "badQos", title: "The payment API left BestEffort", reasoning: "missed",
        drive: (c) => play(c, { inspect: { 0: ["events", "oom"] }, answers: { reqPrompt: "size", memPrompt: "fit", qosPrompt: "leave" }, close: { how: "honest" } }) },
    ],
  };
}
