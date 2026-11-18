// REQ-335: golden paths for GCPDBE/new-feature-query-seq-scan-orders on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPDBE", slug: "new-feature-query-seq-scan-orders" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Query Insights, EXPLAIN, indexes, writes; concurrent index; review; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "insights");
          run(c, "explain");
          run(c, "idx");
          run(c, "writes");
          run(c, "cic");
          run(c, "review");
          run(c, "verify");
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "index" });
        },
      },
      {
        id: "harm",
        title: "Builds the index without CONCURRENTLY",
        reasoning: "missed",
        drive: (c) => {
          run(c, "insights");
          run(c, "plain");
          run(c, "verify");
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "index" });
        },
      },
      {
        id: "noop",
        title: "Tries to double the CPU",
        reasoning: "partial",
        drive: (c) => {
          run(c, "insights");
          run(c, "cpu");
          run(c, "verify");
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "index" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads load and plan, builds concurrently, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "insights");
          run(c, "explain");
          run(c, "cic");
          run(c, "verify");
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "index" });
        },
      },
      {
        id: "late",
        title: "Waits, builds after 10:30",
        reasoning: "partial",
        drive: (c) => {
          run(c, "insights");
          waitUntil(c, 60);
          run(c, "cic");
          run(c, "verify");
          waitUntil(c, 68);
          close(c);
          c.act("document", { cause: "index" });
        },
      },
      {
        id: "blind",
        title: "Builds the index without looking and blames the instance size",
        reasoning: "missed",
        drive: (c) => {
          run(c, "cic");
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "cpu" });
        },
      },
    ],
  };
}
