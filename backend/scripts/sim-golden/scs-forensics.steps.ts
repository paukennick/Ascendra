// REQ-335: golden paths for AWSSCS/miner-instance-evidence-before-scale-in on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AWSSCS", slug: "miner-instance-evidence-before-scale-in" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Finding, schedule, processes, logs; preserve and quarantine; log shipping; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "finding");
          run(c, "sched");
          run(c, "procs");
          run(c, "logs");
          run(c, "preserve");
          run(c, "ship");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "web" });
        },
      },
      {
        id: "harm",
        title: "Terminates the instance",
        reasoning: "missed",
        drive: (c) => {
          run(c, "finding");
          run(c, "terminate");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "web" });
        },
      },
      {
        id: "noop",
        title: "Reboots the instance",
        reasoning: "partial",
        drive: (c) => {
          run(c, "finding");
          run(c, "reboot");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "web" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads finding and schedule, preserves, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "finding");
          run(c, "sched");
          run(c, "preserve");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "web" });
        },
      },
      {
        id: "late",
        title: "Waits, preserves after 22:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "finding");
          waitUntil(c, 45);
          run(c, "preserve");
          run(c, "verify");
          waitUntil(c, 53);
          close(c);
          c.act("document", { cause: "web" });
        },
      },
      {
        id: "blind",
        title: "Preserves without looking and blames GuardDuty",
        reasoning: "missed",
        drive: (c) => {
          run(c, "preserve");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "fp" });
        },
      },
    ],
  };
}
