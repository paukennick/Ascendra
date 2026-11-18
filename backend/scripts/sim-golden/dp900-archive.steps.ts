// REQ-335: golden paths for DP900/auditor-needs-archived-invoices-today on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "DP900", slug: "auditor-needs-archived-invoices-today" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Tier, size, policy, age; high-priority copy; SAS and cleanup; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "tier");
          run(c, "size");
          run(c, "policy");
          run(c, "age");
          run(c, "copyhigh");
          run(c, "share");
          run(c, "verify");
          waitUntil(c, 151);
          close(c);
          c.act("document", { cause: "archive" });
        },
      },
      {
        id: "harm",
        title: "Makes the container public",
        reasoning: "missed",
        drive: (c) => {
          run(c, "tier");
          run(c, "public");
          run(c, "verify");
          waitUntil(c, 151);
          close(c);
          c.act("document", { cause: "archive" });
        },
      },
      {
        id: "noop",
        title: "Rehydrates at standard priority",
        reasoning: "partial",
        drive: (c) => {
          run(c, "tier");
          run(c, "standard");
          run(c, "verify");
          waitUntil(c, 151);
          close(c);
          c.act("document", { cause: "archive" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads tier and size, copies at high priority, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "tier");
          run(c, "size");
          run(c, "copyhigh");
          run(c, "verify");
          waitUntil(c, 151);
          close(c);
          c.act("document", { cause: "archive" });
        },
      },
      {
        id: "late",
        title: "Waits, copies after 15:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "tier");
          waitUntil(c, 150);
          run(c, "copyhigh");
          run(c, "verify");
          waitUntil(c, 158);
          close(c);
          c.act("document", { cause: "archive" });
        },
      },
      {
        id: "blind",
        title: "Copies without looking and blames permissions",
        reasoning: "missed",
        drive: (c) => {
          run(c, "copyhigh");
          waitUntil(c, 151);
          close(c);
          c.act("document", { cause: "perm" });
        },
      },
    ],
  };
}
