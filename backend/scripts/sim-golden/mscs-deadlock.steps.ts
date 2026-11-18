// REQ-333: golden paths for the MSCS deadlock case on the terminal
// (MSCS/mscs-transfer-workers-deadlock.sim.json).
import type { StepPath, StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "MSCS", slug: "mscs-transfer-workers-deadlock" };

type C = Parameters<StepPath["drive"]>[0];
const record = (c: C, cause: string, fix: string) => c.act("document", { cause, fix });

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Queue stats, thread dump (the cycle), lock order patch, concurrency test, deploy, watch it drain",
        reasoning: "met",
        drive: (c) => {
          run(c, "queue");
          run(c, "dump");
          run(c, "write", { p: "order" });
          run(c, "test");
          run(c, "deploy");
          waitUntil(c, 30);
          close(c);
          record(c, "circular", "order");
        },
      },
      {
        id: "restartOnly",
        title: "Restarts twice and closes when transfers flow for a few minutes",
        reasoning: "missed",
        drive: (c) => {
          run(c, "queue");
          run(c, "restart");
          waitUntil(c, 12);
          run(c, "restart");
          close(c);
          record(c, "load", "restart");
        },
      },
      {
        id: "purge",
        title: "Purges the blocked transfers, then finds the cycle and ships the lock order fix",
        reasoning: "partial",
        drive: (c) => {
          run(c, "drop");
          run(c, "dump");
          run(c, "write", { p: "order" });
          run(c, "test");
          run(c, "deploy");
          waitUntil(c, 30);
          close(c);
          record(c, "circular", "order");
        },
      },
      {
        id: "moreThreads",
        title: "Sees 0% CPU, raises the workers to 32 and deploys untested: deadlocked again",
        reasoning: "missed",
        drive: (c) => {
          run(c, "psThreads");
          run(c, "write", { p: "threads" });
          run(c, "deploy");
          waitUntil(c, 20);
          close(c);
          record(c, "load", "threads");
        },
      },
      {
        id: "globalLock",
        title: "Finds the cycle, ships one global lock after a passing test: no deadlock, and the queue drains after the cutoff",
        reasoning: "partial",
        drive: (c) => {
          run(c, "dump");
          run(c, "write", { p: "global" });
          run(c, "test");
          run(c, "deploy");
          waitUntil(c, 55);
          close(c);
          record(c, "circular", "order");
        },
      },
      {
        id: "timeoutUntested",
        title: "Restarts first, then dumps, ships the timeout-and-retry patch without testing",
        reasoning: "partial",
        drive: (c) => {
          run(c, "restart");
          run(c, "dump");
          run(c, "write", { p: "timeout" });
          run(c, "deploy");
          waitUntil(c, 35);
          close(c);
          record(c, "circular", "order");
        },
      },
    ],
  };
}
