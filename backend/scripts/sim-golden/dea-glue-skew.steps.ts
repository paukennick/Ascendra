// REQ-335: golden paths for AWSDEA/glue-join-skewed-on-guest-key on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AWSDEA", slug: "glue-join-skewed-on-guest-key" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Spark UI, keys, skewness, history; split; guard; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "sparkui");
          run(c, "keys");
          run(c, "metric");
          run(c, "hist");
          run(c, "split");
          run(c, "guard");
          run(c, "verify");
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "skew" });
        },
      },
      {
        id: "harm",
        title: "Copies yesterday's output",
        reasoning: "missed",
        drive: (c) => {
          run(c, "sparkui");
          run(c, "stale");
          run(c, "verify");
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "skew" });
        },
      },
      {
        id: "noop",
        title: "Re-runs on 60 workers",
        reasoning: "partial",
        drive: (c) => {
          run(c, "sparkui");
          run(c, "workers");
          run(c, "verify");
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "skew" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads tasks and keys, re-runs with the split, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "sparkui");
          run(c, "keys");
          run(c, "split");
          run(c, "verify");
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "skew" });
        },
      },
      {
        id: "late",
        title: "Waits for the run, splits after 06:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "sparkui");
          waitUntil(c, 60);
          run(c, "split");
          run(c, "verify");
          waitUntil(c, 68);
          close(c);
          c.act("document", { cause: "skew" });
        },
      },
      {
        id: "blind",
        title: "Re-runs with the split without looking and blames capacity",
        reasoning: "missed",
        drive: (c) => {
          run(c, "split");
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "capacity" });
        },
      },
    ],
  };
}
