// REQ-335: golden paths for GCPMLE/retrain-pipeline-trains-on-broken-feed on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPMLE", slug: "retrain-pipeline-trains-on-broken-feed" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Statistics, run, evaluation code, serving; stop and keep; gates; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "stats");
          run(c, "run");
          run(c, "eval");
          run(c, "serving");
          run(c, "stop");
          run(c, "gates");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "data" });
        },
      },
      {
        id: "harm",
        title: "Lets the run deploy",
        reasoning: "missed",
        drive: (c) => {
          run(c, "stats");
          run(c, "approve");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "data" });
        },
      },
      {
        id: "noop",
        title: "Re-runs on a bigger machine",
        reasoning: "partial",
        drive: (c) => {
          run(c, "stats");
          run(c, "bigger");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "data" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads stats and run, stops it, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "stats");
          run(c, "run");
          run(c, "stop");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "data" });
        },
      },
      {
        id: "late",
        title: "Waits, stops after 05:30",
        reasoning: "partial",
        drive: (c) => {
          run(c, "stats");
          waitUntil(c, 50);
          run(c, "stop");
          run(c, "verify");
          waitUntil(c, 58);
          close(c);
          c.act("document", { cause: "data" });
        },
      },
      {
        id: "blind",
        title: "Stops the run without looking and blames hardware",
        reasoning: "missed",
        drive: (c) => {
          run(c, "stop");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "model" });
        },
      },
    ],
  };
}
