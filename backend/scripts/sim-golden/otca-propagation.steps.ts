// REQ-320: golden paths for OTCA/split-traces-b3-propagator on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "OTCA", slug: "split-traces-b3-propagator" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Root traces, headers, payments' propagators, set payments to W3C, read the joined trace, verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "search");
          run(c, "headers");
          run(c, "payEnv");
          run(c, "setPay");
          run(c, "readTrace");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "propagator" });
        },
      },
      {
        id: "sampling",
        title: "Samples everything and restarts the collector",
        reasoning: "missed",
        drive: (c) => {
          run(c, "search");
          run(c, "sampleAll");
          run(c, "restartCollector");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "sampling" });
        },
      },
      {
        id: "flipCheckout",
        title: "Reads both environments and switches checkout to B3",
        reasoning: "partial",
        drive: (c) => {
          run(c, "payEnv");
          run(c, "coEnv");
          run(c, "setCheckout");
          run(c, "readTrace");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "propagator" });
        },
      },
      {
        id: "blindFix",
        title: "Sets payments' propagators without reading anything, then reads the trace",
        reasoning: "partial",
        drive: (c) => {
          run(c, "setPay");
          run(c, "readTrace");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "propagator" });
        },
      },
      {
        id: "lateFix",
        title: "Samples everything first, then finds the propagator after the train",
        reasoning: "partial",
        drive: (c) => {
          run(c, "sampleAll");
          run(c, "search");
          waitUntil(c, 46);
          run(c, "headers");
          run(c, "payEnv");
          run(c, "setPay");
          run(c, "readTrace");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "propagator" });
        },
      },
      {
        id: "collectorThenFix",
        title: "Restarts the collector, then finds and fixes the propagator and checks",
        reasoning: "partial",
        drive: (c) => {
          run(c, "restartCollector");
          run(c, "headers");
          run(c, "payEnv");
          run(c, "setPay");
          run(c, "readTrace");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "propagator" });
        },
      },
    ],
  };
}
