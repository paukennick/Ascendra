// REQ-335: golden paths for AWSDEA/dynamodb-backfill-throttles-checkout on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AWSDEA", slug: "dynamodb-backfill-throttles-checkout" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Capacity, backfill, contributors, app; cap; schedule; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "cw");
          run(c, "bfstat");
          run(c, "contrib");
          run(c, "app");
          run(c, "cap");
          run(c, "tonight");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "backfill" });
        },
      },
      {
        id: "harm",
        title: "Raises the backfill to 128 workers",
        reasoning: "missed",
        drive: (c) => {
          run(c, "cw");
          run(c, "more");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "backfill" });
        },
      },
      {
        id: "noop",
        title: "Raises the Lambda's memory",
        reasoning: "partial",
        drive: (c) => {
          run(c, "cw");
          run(c, "memory");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "backfill" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads capacity and backfill, caps it, verifies; nothing scheduled",
        reasoning: "partial",
        drive: (c) => {
          run(c, "cw");
          run(c, "bfstat");
          run(c, "cap");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "backfill" });
        },
      },
      {
        id: "late",
        title: "Waits, caps after 12:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "cw");
          waitUntil(c, 45);
          run(c, "cap");
          run(c, "verify");
          waitUntil(c, 53);
          close(c);
          c.act("document", { cause: "backfill" });
        },
      },
      {
        id: "blind",
        title: "Caps without looking and blames a hot key",
        reasoning: "missed",
        drive: (c) => {
          run(c, "cap");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "hotkey" });
        },
      },
    ],
  };
}
