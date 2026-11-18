// REQ-335: golden paths for AZ400/debug-logging-hits-daily-cap-blind on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AZ400", slug: "debug-logging-hits-daily-cap-blind" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Quota, volume, log level, cap; restore; separate and filter; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "quota");
          run(c, "volume");
          run(c, "loglevel");
          run(c, "cap");
          run(c, "restore");
          run(c, "guard");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "cap" });
        },
      },
      {
        id: "harm",
        title: "Deletes and recreates the workspace",
        reasoning: "missed",
        drive: (c) => {
          run(c, "quota");
          run(c, "recreate");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "cap" });
        },
      },
      {
        id: "noop",
        title: "Restarts the app",
        reasoning: "partial",
        drive: (c) => {
          run(c, "quota");
          run(c, "restart");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "cap" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads quota and volume, restores, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "quota");
          run(c, "volume");
          run(c, "restore");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "cap" });
        },
      },
      {
        id: "late",
        title: "Waits, restores after 13:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "quota");
          waitUntil(c, 50);
          run(c, "restore");
          run(c, "verify");
          waitUntil(c, 58);
          close(c);
          c.act("document", { cause: "cap" });
        },
      },
      {
        id: "blind",
        title: "Raises the cap without looking and blames an outage",
        reasoning: "missed",
        drive: (c) => {
          run(c, "restore");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "outage" });
        },
      },
    ],
  };
}
