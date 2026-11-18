// REQ-335: golden paths for DP300/app-pinned-to-old-primary-after-geo-failover on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "DP300", slug: "app-pinned-to-old-primary-after-geo-failover" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Roles, connection string, errors, other services; listener; deploy check; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "roles");
          run(c, "conn");
          run(c, "err");
          run(c, "others");
          run(c, "listener");
          run(c, "audit");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "servername" });
        },
      },
      {
        id: "harm",
        title: "Forces failover back to East",
        reasoning: "missed",
        drive: (c) => {
          run(c, "roles");
          run(c, "forceback");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "servername" });
        },
      },
      {
        id: "noop",
        title: "Restarts the order service",
        reasoning: "partial",
        drive: (c) => {
          run(c, "roles");
          run(c, "restart");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "servername" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads roles and string, moves to the listener, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "roles");
          run(c, "conn");
          run(c, "listener");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "servername" });
        },
      },
      {
        id: "late",
        title: "Waits, changes after 08:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "roles");
          waitUntil(c, 80);
          run(c, "listener");
          run(c, "verify");
          waitUntil(c, 88);
          close(c);
          c.act("document", { cause: "servername" });
        },
      },
      {
        id: "blind",
        title: "Changes the string without looking and blames permissions",
        reasoning: "missed",
        drive: (c) => {
          run(c, "listener");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "outage" });
        },
      },
    ],
  };
}
