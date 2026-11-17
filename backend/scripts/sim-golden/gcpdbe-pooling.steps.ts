// REQ-320: golden paths for GCPDBE/cloud-run-exhausts-sql-connections on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPDBE", slug: "cloud-run-exhausts-sql-connections" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Errors, Cloud Run, pg_stat_activity, cap, pooler scheduled, verified",
        reasoning: "met",
        drive: (c) => {
          run(c, "errors");
          run(c, "runInfo");
          run(c, "activity");
          run(c, "cap");
          run(c, "plan");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "connections" });
        },
      },
      {
        id: "restartNow",
        title: "Raises max_connections during the sale",
        reasoning: "missed",
        drive: (c) => {
          run(c, "errors");
          run(c, "maxConn");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "connections" });
        },
      },
      {
        id: "poolNow",
        title: "Enables the pooler during the sale",
        reasoning: "partial",
        drive: (c) => {
          run(c, "errors");
          run(c, "activity");
          run(c, "poolNow");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "connections" });
        },
      },
      {
        id: "capOnly",
        title: "Caps Cloud Run from the error alone and verifies, no pooler plan",
        reasoning: "partial",
        drive: (c) => {
          run(c, "errors");
          run(c, "cap");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "connections" });
        },
      },
      {
        id: "late",
        title: "Waits on the dashboards, then caps after 10:58",
        reasoning: "partial",
        drive: (c) => {
          run(c, "runInfo");
          waitUntil(c, 38);
          run(c, "cap");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "connections" });
        },
      },
      {
        id: "blind",
        title: "Caps without looking and blames CPU",
        reasoning: "missed",
        drive: (c) => {
          run(c, "cap");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "cpu" });
        },
      },
      {
        id: "watchOnly",
        title: "Diagnoses correctly but changes nothing before the peak",
        reasoning: "partial",
        drive: (c) => {
          run(c, "errors");
          run(c, "runInfo");
          run(c, "activity");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "connections" });
        },
      },
    ],
  };
}
