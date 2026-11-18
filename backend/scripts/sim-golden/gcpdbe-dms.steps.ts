// REQ-335: golden paths for GCPDBE/dms-cutover-delay-never-reaches-zero on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPDBE", slug: "dms-cutover-delay-never-reaches-zero" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Source activity, delay, cron jobs, runbook; stop and promote; re-create; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "act");
          run(c, "delay");
          run(c, "cron");
          run(c, "runbook");
          run(c, "stopcron");
          run(c, "recreate");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "cron" });
        },
      },
      {
        id: "harm",
        title: "Promotes at 40 seconds of delay",
        reasoning: "missed",
        drive: (c) => {
          run(c, "act");
          run(c, "promote");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "cron" });
        },
      },
      {
        id: "noop",
        title: "Raises the destination's tier",
        reasoning: "partial",
        drive: (c) => {
          run(c, "act");
          run(c, "restartjob");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "cron" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads activity and delay, stops the job and promotes, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "act");
          run(c, "delay");
          run(c, "stopcron");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "cron" });
        },
      },
      {
        id: "late",
        title: "Waits, acts after 00:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "act");
          waitUntil(c, 50);
          run(c, "stopcron");
          run(c, "verify");
          waitUntil(c, 58);
          close(c);
          c.act("document", { cause: "cron" });
        },
      },
      {
        id: "blind",
        title: "Stops the job and promotes without looking, blames the network",
        reasoning: "missed",
        drive: (c) => {
          run(c, "stopcron");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "slow" });
        },
      },
    ],
  };
}
