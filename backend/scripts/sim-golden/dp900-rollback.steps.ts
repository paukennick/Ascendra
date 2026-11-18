// REQ-335: golden paths for DP900/delete-without-where-open-transaction on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "DP900", slug: "delete-without-where-open-transaction" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Statement, count, waits, test row; rollback and correct delete; habit; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "query");
          run(c, "count");
          run(c, "wait");
          run(c, "test");
          run(c, "rollback");
          run(c, "habit");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "nowhere" });
        },
      },
      {
        id: "harm",
        title: "Commits the transaction",
        reasoning: "missed",
        drive: (c) => {
          run(c, "query");
          run(c, "commit");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "nowhere" });
        },
      },
      {
        id: "noop",
        title: "Reopens own query window",
        reasoning: "partial",
        drive: (c) => {
          run(c, "query");
          run(c, "restart");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "nowhere" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads statement and count, rolls back, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "query");
          run(c, "count");
          run(c, "rollback");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "nowhere" });
        },
      },
      {
        id: "late",
        title: "Waits, rolls back after 10:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "query");
          waitUntil(c, 40);
          run(c, "rollback");
          run(c, "verify");
          waitUntil(c, 48);
          close(c);
          c.act("document", { cause: "nowhere" });
        },
      },
      {
        id: "blind",
        title: "Rolls back without looking and blames the server",
        reasoning: "missed",
        drive: (c) => {
          run(c, "rollback");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "server" });
        },
      },
    ],
  };
}
