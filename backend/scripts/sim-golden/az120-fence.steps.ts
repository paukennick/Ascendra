// REQ-335: golden paths for AZ120/fence-agent-lost-role-before-maintenance on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AZ120", slug: "fence-agent-lost-role-before-maintenance" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "pcs, log, role assignments, agent list; restore role; guard; takeover",
        reasoning: "met",
        drive: (c) => {
          run(c, "pcs");
          run(c, "msg");
          run(c, "rbac");
          run(c, "list");
          run(c, "role");
          run(c, "guard");
          run(c, "verify");
          waitUntil(c, 121);
          close(c);
          c.act("document", { cause: "role" });
        },
      },
      {
        id: "harm",
        title: "Turns STONITH off",
        reasoning: "missed",
        drive: (c) => {
          run(c, "pcs");
          run(c, "nostonith");
          run(c, "verify");
          waitUntil(c, 121);
          close(c);
          c.act("document", { cause: "role" });
        },
      },
      {
        id: "noop",
        title: "Restarts Pacemaker on hana-db2",
        reasoning: "partial",
        drive: (c) => {
          run(c, "pcs");
          run(c, "restart");
          run(c, "verify");
          waitUntil(c, 121);
          close(c);
          c.act("document", { cause: "role" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads pcs and the log, restores the role, tests",
        reasoning: "partial",
        drive: (c) => {
          run(c, "pcs");
          run(c, "msg");
          run(c, "role");
          run(c, "verify");
          waitUntil(c, 121);
          close(c);
          c.act("document", { cause: "role" });
        },
      },
      {
        id: "late",
        title: "Waits, restores after 22:30",
        reasoning: "partial",
        drive: (c) => {
          run(c, "pcs");
          waitUntil(c, 120);
          run(c, "role");
          run(c, "verify");
          waitUntil(c, 128);
          close(c);
          c.act("document", { cause: "role" });
        },
      },
      {
        id: "blind",
        title: "Restores the role without looking and blames replication",
        reasoning: "missed",
        drive: (c) => {
          run(c, "role");
          waitUntil(c, 121);
          close(c);
          c.act("document", { cause: "hsr" });
        },
      },
    ],
  };
}
