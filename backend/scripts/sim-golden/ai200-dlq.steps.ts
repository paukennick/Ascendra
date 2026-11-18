// REQ-335: golden paths for AI200/orders-dead-lettered-after-schema-bug on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AI200", slug: "orders-dead-lettered-after-schema-bug" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Peek, fix test, idempotency, reasons; resubmit; alert and tests; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "peek");
          run(c, "fn");
          run(c, "idem");
          run(c, "other");
          run(c, "resubmit");
          run(c, "alert");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "bug" });
        },
      },
      {
        id: "harm",
        title: "Purges the dead-letter queue",
        reasoning: "missed",
        drive: (c) => {
          run(c, "peek");
          run(c, "purge");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "bug" });
        },
      },
      {
        id: "noop",
        title: "Restarts the function app",
        reasoning: "partial",
        drive: (c) => {
          run(c, "peek");
          run(c, "restartfn");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "bug" });
        },
      },
      {
        id: "fixOnly",
        title: "Peeks and tests the fix, resubmits, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "peek");
          run(c, "fn");
          run(c, "resubmit");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "bug" });
        },
      },
      {
        id: "late",
        title: "Waits, resubmits after 09:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "peek");
          waitUntil(c, 80);
          run(c, "resubmit");
          run(c, "verify");
          waitUntil(c, 88);
          close(c);
          c.act("document", { cause: "bug" });
        },
      },
      {
        id: "blind",
        title: "Resubmits without looking and blames throttling",
        reasoning: "missed",
        drive: (c) => {
          run(c, "resubmit");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "throttle" });
        },
      },
    ],
  };
}
