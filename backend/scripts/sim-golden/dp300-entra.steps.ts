// REQ-335: golden paths for DP300/managed-identity-login-fails-new-database on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "DP300", slug: "managed-identity-login-fails-new-database" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Principals, SIDs, RBAC, connection string; create user; clean up; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "users");
          run(c, "sid");
          run(c, "rbac");
          run(c, "conn");
          run(c, "user");
          run(c, "cleanup");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "user" });
        },
      },
      {
        id: "harm",
        title: "Switches to the admin login",
        reasoning: "missed",
        drive: (c) => {
          run(c, "users");
          run(c, "sa");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "user" });
        },
      },
      {
        id: "noop",
        title: "Adds SQL Server Contributor",
        reasoning: "partial",
        drive: (c) => {
          run(c, "users");
          run(c, "contrib");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "user" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads principals and SIDs, creates the user, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "users");
          run(c, "sid");
          run(c, "user");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "user" });
        },
      },
      {
        id: "late",
        title: "Waits, creates after 09:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "users");
          waitUntil(c, 45);
          run(c, "user");
          run(c, "verify");
          waitUntil(c, 53);
          close(c);
          c.act("document", { cause: "user" });
        },
      },
      {
        id: "blind",
        title: "Creates the user without looking and blames the firewall",
        reasoning: "missed",
        drive: (c) => {
          run(c, "user");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "rbac" });
        },
      },
    ],
  };
}
