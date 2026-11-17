// REQ-320: golden paths for ICA/retry-storm-one-bad-ratings-pod on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "ICA", slug: "retry-storm-one-bad-ratings-pod" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Policy, per-pod metrics, DestinationRule, bounded retries, outlier detection at 50%, verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "getVs");
          run(c, "metrics");
          run(c, "getDr");
          run(c, "setRetries", {"r": "sane"});
          run(c, "setOutlier", {"e": "half"});
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "retries" });
        },
      },
      {
        id: "moreRetries",
        title: "Raises retries to make ratings more reliable",
        reasoning: "missed",
        drive: (c) => {
          run(c, "setRetries", {"r": "more"});
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "capacity" });
        },
      },
      {
        id: "deleteRestart",
        title: "Deletes the bad pod and restarts the gateway",
        reasoning: "missed",
        drive: (c) => {
          run(c, "metrics");
          run(c, "deletePod");
          run(c, "restartIngress");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "ingress" });
        },
      },
      {
        id: "ejectAll",
        title: "Bounds retries but sets an ejection policy that can eject every pod",
        reasoning: "partial",
        drive: (c) => {
          run(c, "getVs");
          run(c, "setRetries", {"r": "sane"});
          run(c, "setOutlier", {"e": "all"});
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "retries" });
        },
      },
      {
        id: "noRetries",
        title: "Turns retries off and stops there",
        reasoning: "partial",
        drive: (c) => {
          run(c, "getVs");
          run(c, "metrics");
          run(c, "setRetries", {"r": "none"});
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "retries" });
        },
      },
      {
        id: "noCheck",
        title: "Reads the policy and metrics, bounds retries and adds outlier detection, never checks p99",
        reasoning: "partial",
        drive: (c) => {
          run(c, "getVs");
          run(c, "metrics");
          run(c, "setRetries", {"r": "sane"});
          run(c, "setOutlier", {"e": "half"});
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "retries" });
        },
      },
    ],
  };
}
