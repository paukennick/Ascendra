// REQ-297: golden paths for the AWS SOA point-in-time restore case on the board
// screen (AWSSOA/rds-update-without-where-pitr.sim.json). Each task costs
// minutes through the `work` wait; restores and repairs finish later through
// triggers, so a path watches until they land. No prototype exists, so the
// expectations are the engine's own results.
import type { StepsSpec, Ctl } from "./steps.ts";
import { close, task } from "./secplus-helpers.ts";

export const ENTRY = { course: "AWSSOA", slug: "rds-update-without-where-pitr" };

function until(c: Ctl, pred: () => boolean): void {
  let n = 0;
  while (!c.run.state.ended && c.run.state.phase === "incident" && !pred() && n++ < 40) task(c, "watch");
}

const ready = (c: Ctl) => () => c.value("restoredReady") === true;
const repairDone = (c: Ctl) => () => c.value("repairing") === false;

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Pause refunds, read the log, restore to 13:51 with the production security group, copy the column back, verify, resume, delete the copy",
        reasoning: "met",
        drive: (c) => {
          task(c, "pauseRefunds");
          task(c, "readLog");
          task(c, "restore", { point: "pre", sg: "custom" });
          until(c, ready(c));
          task(c, "repair");
          until(c, repairDone(c));
          task(c, "verify");
          task(c, "resumeRefunds");
          task(c, "deleteCopy");
          close(c);
          c.act("document", { cause: "where", method: "pitrColumn" });
        },
      },
      {
        id: "defaultSg",
        title: "Restores without reading the log, on the default security group; fixes it and repairs, leaves the copy running",
        reasoning: "partial",
        drive: (c) => {
          task(c, "pauseRefunds");
          task(c, "restore", { point: "pre", sg: "default" });
          until(c, ready(c));
          task(c, "repair");
          task(c, "fixSg");
          task(c, "repair");
          until(c, repairDone(c));
          task(c, "verify");
          task(c, "resumeRefunds");
          close(c);
          c.act("document", { cause: "where", method: "pitrColumn" });
        },
      },
      {
        id: "latestFirst",
        title: "Restores to the latest restorable time, repairs nothing, then restores again too late for the pickup",
        reasoning: "partial",
        drive: (c) => {
          task(c, "pauseRefunds");
          task(c, "restore", { point: "latest", sg: "custom" });
          until(c, ready(c));
          task(c, "repair");
          until(c, repairDone(c));
          task(c, "readLog");
          task(c, "restore", { point: "pre", sg: "custom" });
          until(c, ready(c));
          task(c, "repair");
          until(c, repairDone(c));
          task(c, "verify");
          task(c, "resumeRefunds");
          task(c, "deleteCopy");
          close(c);
          c.act("document", { cause: "where", method: "pitrColumn" });
        },
      },
      {
        id: "swap",
        title: "Restores to 13:51 and switches the application to the copy",
        reasoning: "partial",
        drive: (c) => {
          task(c, "pauseRefunds");
          task(c, "readLog");
          task(c, "restore", { point: "pre", sg: "custom" });
          until(c, ready(c));
          task(c, "swap");
          task(c, "verify");
          close(c);
          c.act("document", { cause: "where", method: "swap" });
        },
      },
      {
        id: "noPause",
        title: "Right restore and repair, but the refund worker keeps running",
        reasoning: "partial",
        drive: (c) => {
          task(c, "readLog");
          task(c, "restore", { point: "pre", sg: "custom" });
          until(c, ready(c));
          task(c, "repair");
          until(c, repairDone(c));
          task(c, "verify");
          task(c, "deleteCopy");
          close(c);
          c.act("document", { cause: "where", method: "pitrColumn" });
        },
      },
      {
        id: "closeEarly",
        title: "Pauses refunds and reads the log, then closes blaming RDS",
        reasoning: "missed",
        drive: (c) => {
          task(c, "pauseRefunds");
          task(c, "readLog");
          close(c);
          c.act("document", { cause: "rds", method: "snapshot" });
        },
      },
    ],
  };
}
