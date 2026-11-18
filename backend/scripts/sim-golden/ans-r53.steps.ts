// REQ-335: golden paths for AWSANS/failover-record-without-health-check on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AWSANS", slug: "failover-record-without-health-check" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Records, tiers, health checks, TTL; health check on primary; alarm and test; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "records");
          run(c, "site");
          run(c, "hc");
          run(c, "ttl");
          run(c, "addcheck");
          run(c, "guard");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "nohc" });
        },
      },
      {
        id: "harm",
        title: "Replaces failover with a long-TTL simple record",
        reasoning: "missed",
        drive: (c) => {
          run(c, "records");
          run(c, "simple");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "nohc" });
        },
      },
      {
        id: "noop",
        title: "Restarts the east tier",
        reasoning: "partial",
        drive: (c) => {
          run(c, "records");
          run(c, "restart");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "nohc" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads records and tiers, adds the health check, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "records");
          run(c, "site");
          run(c, "addcheck");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "nohc" });
        },
      },
      {
        id: "late",
        title: "Waits, adds the check after 19:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "records");
          waitUntil(c, 55);
          run(c, "addcheck");
          run(c, "verify");
          waitUntil(c, 63);
          close(c);
          c.act("document", { cause: "nohc" });
        },
      },
      {
        id: "blind",
        title: "Adds a check without looking and blames resolvers",
        reasoning: "missed",
        drive: (c) => {
          run(c, "addcheck");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "resolver" });
        },
      },
    ],
  };
}
