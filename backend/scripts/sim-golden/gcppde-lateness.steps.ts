// REQ-320: golden paths for GCPPDE/streaming-window-drops-late-rides on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPPDE", slug: "streaming-window-drops-late-rides" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Reconciliation, drop counter, code, arrival delay, drained replacement, backfill, verified",
        reasoning: "met",
        drive: (c) => {
          run(c, "reconcile");
          run(c, "dropped");
          run(c, "code");
          run(c, "lag");
          run(c, "deploy", {"h": "drain"});
          run(c, "backfill");
          waitUntil(c, 28);
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "late" });
        },
      },
      {
        id: "cancel",
        title: "Cancels the running job to replace it",
        reasoning: "missed",
        drive: (c) => {
          run(c, "dropped");
          run(c, "deploy", {"h": "cancel"});
          run(c, "backfill");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "late" });
        },
      },
      {
        id: "scaleOut",
        title: "Adds workers",
        reasoning: "missed",
        drive: (c) => {
          run(c, "reconcile");
          run(c, "scale");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "scale" });
        },
      },
      {
        id: "noMeasure",
        title: "Finds the drops, drains and backfills, verifies, without measuring the delay",
        reasoning: "partial",
        drive: (c) => {
          run(c, "reconcile");
          run(c, "dropped");
          run(c, "deploy", {"h": "drain"});
          run(c, "backfill");
          waitUntil(c, 28);
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "late" });
        },
      },
      {
        id: "backfillOnly",
        title: "Backfills the history but leaves the windows as they are",
        reasoning: "partial",
        drive: (c) => {
          run(c, "reconcile");
          run(c, "dropped");
          run(c, "backfill");
          waitUntil(c, 20);
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "late" });
        },
      },
      {
        id: "late",
        title: "Adds workers and waits, then fixes both after 15:42",
        reasoning: "partial",
        drive: (c) => {
          run(c, "scale");
          waitUntil(c, 32);
          run(c, "dropped");
          run(c, "deploy", {"h": "drain"});
          run(c, "backfill");
          waitUntil(c, 56);
          run(c, "verify");
          close(c);
          c.act("document", { cause: "late" });
        },
      },
      {
        id: "blind",
        title: "Drains, replaces and backfills without reading anything or checking",
        reasoning: "missed",
        drive: (c) => {
          run(c, "deploy", {"h": "drain"});
          run(c, "backfill");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "processor" });
        },
      },
    ],
  };
}
