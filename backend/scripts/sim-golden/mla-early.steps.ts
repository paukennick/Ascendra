// REQ-335: golden paths for AWSMLA/tuning-job-early-stopping-never-fires on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AWSMLA", slug: "tuning-job-early-stopping-never-fires" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Metric history, script, setting, curves; per-epoch metric; template and budget; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "metrics");
          run(c, "log");
          run(c, "cfg");
          run(c, "curves");
          run(c, "perepoch");
          run(c, "guard");
          run(c, "verify");
          waitUntil(c, 241);
          close(c);
          c.act("document", { cause: "metric" });
        },
      },
      {
        id: "harm",
        title: "Stops tuning and deploys the best so far",
        reasoning: "missed",
        drive: (c) => {
          run(c, "metrics");
          run(c, "kill");
          run(c, "verify");
          waitUntil(c, 241);
          close(c);
          c.act("document", { cause: "metric" });
        },
      },
      {
        id: "noop",
        title: "Cuts epochs to 40",
        reasoning: "partial",
        drive: (c) => {
          run(c, "metrics");
          run(c, "epochs");
          run(c, "verify");
          waitUntil(c, 241);
          close(c);
          c.act("document", { cause: "metric" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads metrics and script, logs per epoch, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "metrics");
          run(c, "log");
          run(c, "perepoch");
          run(c, "verify");
          waitUntil(c, 241);
          close(c);
          c.act("document", { cause: "metric" });
        },
      },
      {
        id: "late",
        title: "Waits, fixes after 18:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "metrics");
          waitUntil(c, 240);
          run(c, "perepoch");
          run(c, "verify");
          waitUntil(c, 248);
          close(c);
          c.act("document", { cause: "metric" });
        },
      },
      {
        id: "blind",
        title: "Changes logging without looking and blames GPU prices",
        reasoning: "missed",
        drive: (c) => {
          run(c, "perepoch");
          waitUntil(c, 241);
          close(c);
          c.act("document", { cause: "off" });
        },
      },
    ],
  };
}
