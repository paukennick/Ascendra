// REQ-320: golden paths for PCA/canary-gate-wrong-p99-query on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "PCA", slug: "canary-gate-wrong-p99-query" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Gate query, scrape interval, correct p99, abort, fix the gate, recording rule",
        reasoning: "met",
        drive: (c) => {
          run(c, "gateQuery");
          run(c, "scrape");
          run(c, "query", {"q": "right"});
          run(c, "abort");
          run(c, "fixGate", {"g": "right"});
          run(c, "rule");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "query" });
        },
      },
      {
        id: "trustGate",
        title: "Trusts the gate and promotes",
        reasoning: "missed",
        drive: (c) => {
          run(c, "promote");
          close(c);
          c.act("document", { cause: "traffic" });
        },
      },
      {
        id: "meanGate",
        title: "Measures the mean, puts it in the gate and waits",
        reasoning: "missed",
        drive: (c) => {
          run(c, "query", {"q": "mean"});
          run(c, "fixGate", {"g": "mean"});
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "traffic" });
        },
      },
      {
        id: "pauseSilence",
        title: "Pauses and silences the latency alert",
        reasoning: "partial",
        drive: (c) => {
          run(c, "gateQuery");
          run(c, "pause");
          run(c, "silence");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "query" });
        },
      },
      {
        id: "pauseOnly",
        title: "Finds the real p99 and pauses, leaving the gate and rollout as they are",
        reasoning: "partial",
        drive: (c) => {
          run(c, "query", {"q": "short"});
          run(c, "query", {"q": "right"});
          run(c, "pause");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "query" });
        },
      },
      {
        id: "fixNoRule",
        title: "Reads the gate, finds the p99, aborts and fixes the gate, no recording rule",
        reasoning: "partial",
        drive: (c) => {
          run(c, "gateQuery");
          run(c, "query", {"q": "right"});
          run(c, "abort");
          run(c, "fixGate", {"g": "right"});
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "query" });
        },
      },
    ],
  };
}
