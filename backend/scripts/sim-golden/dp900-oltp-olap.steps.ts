// REQ-335: golden paths for DP900/year-end-report-runs-on-checkout-database on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "DP900", slug: "year-end-report-runs-on-checkout-database" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Sessions, updateability, tier, workload types; move the report; habit; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "top");
          run(c, "where");
          run(c, "tier");
          run(c, "kind");
          run(c, "move");
          run(c, "habit");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "mixed" });
        },
      },
      {
        id: "harm",
        title: "Fails the database over",
        reasoning: "missed",
        drive: (c) => {
          run(c, "top");
          run(c, "failover");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "mixed" });
        },
      },
      {
        id: "noop",
        title: "Raises the storage size",
        reasoning: "partial",
        drive: (c) => {
          run(c, "top");
          run(c, "storage");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "mixed" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads sessions and updateability, moves the report, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "top");
          run(c, "where");
          run(c, "move");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "mixed" });
        },
      },
      {
        id: "late",
        title: "Waits, moves after 12:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "top");
          waitUntil(c, 45);
          run(c, "move");
          run(c, "verify");
          waitUntil(c, 53);
          close(c);
          c.act("document", { cause: "mixed" });
        },
      },
      {
        id: "blind",
        title: "Moves the report without looking and blames the network",
        reasoning: "missed",
        drive: (c) => {
          run(c, "move");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "storage" });
        },
      },
    ],
  };
}
