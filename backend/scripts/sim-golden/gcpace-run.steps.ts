// REQ-297: golden paths for the GCP ACE Cloud Run bad revision case on the
// board screen (GCPACE/cloud-run-bad-revision-rollback.sim.json). Each task
// costs minutes through the `work` wait; deploys land later through triggers,
// so a path watches until they do. No prototype exists, so the expectations
// are the engine's own results.
import type { StepsSpec, Ctl } from "./steps.ts";
import { close, task } from "./secplus-helpers.ts";

export const ENTRY = { course: "GCPACE", slug: "cloud-run-bad-revision-rollback" };

function until(c: Ctl, name: string): void {
  let n = 0;
  while (!c.run.state.ended && c.run.state.phase === "incident" && c.value(name) !== true && n++ < 40) task(c, "watch");
}

function safeRollout(c: Ctl): void {
  task(c, "deployFix", { mode: "noTraffic" });
  until(c, "deployed43");
  task(c, "testTag");
  task(c, "fixAgain");
  until(c, "deployed44");
  task(c, "testTag");
  task(c, "canary", { rev: "r44" });
  task(c, "watch");
  task(c, "promote");
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Errors by revision, roll back with update-traffic, then the fix tagged, tested and canaried",
        reasoning: "met",
        drive: (c) => {
          task(c, "metrics");
          task(c, "rollback");
          task(c, "logs");
          safeRollout(c);
          close(c);
          c.act("document", { cause: "env", method: "traffic" });
        },
      },
      {
        id: "fullDeploy",
        title: "Rolls back, then deploys the fix with all traffic, untested: it charges the sandbox",
        reasoning: "partial",
        drive: (c) => {
          task(c, "metrics");
          task(c, "rollback");
          task(c, "logs");
          task(c, "deployFix", { mode: "full" });
          until(c, "deployed43");
          task(c, "watch");
          close(c);
          c.act("document", { cause: "env", method: "traffic" });
        },
      },
      {
        id: "rebuild",
        title: "Rebuilds the old code instead of moving traffic; the fix then goes out safely",
        reasoning: "partial",
        drive: (c) => {
          task(c, "logs");
          task(c, "rebuild");
          until(c, "rebuilt");
          safeRollout(c);
          close(c);
          c.act("document", { cause: "env", method: "rebuild" });
        },
      },
      {
        id: "scaleWait",
        title: "Adds instances and waits half an hour before rolling back",
        reasoning: "missed",
        drive: (c) => {
          task(c, "scaleUp");
          task(c, "logs");
          task(c, "watch");
          task(c, "watch");
          task(c, "watch");
          task(c, "metrics");
          task(c, "rollback");
          close(c);
          c.act("document", { cause: "env", method: "traffic" });
        },
      },
      {
        id: "stillBroken",
        title: "Reads the logs and closes blaming capacity",
        reasoning: "missed",
        drive: (c) => {
          task(c, "logs");
          close(c);
          c.act("document", { cause: "capacity", method: "rebuild" });
        },
      },
      {
        id: "rollbackOnly",
        title: "Rolls back at once and closes without shipping the fix",
        reasoning: "partial",
        drive: (c) => {
          task(c, "metrics");
          task(c, "rollback");
          task(c, "logs");
          close(c);
          c.act("document", { cause: "env", method: "traffic" });
        },
      },
    ],
  };
}
