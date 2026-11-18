// REQ-335: golden paths for GCPDBE/reporting-query-stalls-read-replica on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPDBE", slug: "reporting-query-stalls-read-replica" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Lag metrics, blocker, settings, size; cancel and separate; alert; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "lag");
          run(c, "blocker");
          run(c, "conf");
          run(c, "size");
          run(c, "cancel");
          run(c, "alert");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "replay" });
        },
      },
      {
        id: "harm",
        title: "Promotes the replica",
        reasoning: "missed",
        drive: (c) => {
          run(c, "lag");
          run(c, "promote");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "replay" });
        },
      },
      {
        id: "noop",
        title: "Raises max_connections",
        reasoning: "partial",
        drive: (c) => {
          run(c, "lag");
          run(c, "maxconn");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "replay" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads lag and blocker, unblocks and separates, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "lag");
          run(c, "blocker");
          run(c, "cancel");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "replay" });
        },
      },
      {
        id: "late",
        title: "Waits, acts after 14:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "lag");
          waitUntil(c, 40);
          run(c, "cancel");
          run(c, "verify");
          waitUntil(c, 48);
          close(c);
          c.act("document", { cause: "replay" });
        },
      },
      {
        id: "blind",
        title: "Acts without looking and blames the network",
        reasoning: "missed",
        drive: (c) => {
          run(c, "cancel");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "network" });
        },
      },
    ],
  };
}
