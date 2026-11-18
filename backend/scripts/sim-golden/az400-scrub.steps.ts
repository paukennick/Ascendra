// REQ-335: golden paths for AZ400/storage-key-in-history-before-open-source on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AZ400", slug: "storage-key-in-history-before-open-source" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "History, live key, consumers, permission; rotate and rewrite; guard; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "hist");
          run(c, "live");
          run(c, "users");
          run(c, "perm");
          run(c, "scrub");
          run(c, "guard");
          run(c, "verify");
          waitUntil(c, 161);
          close(c);
          c.act("document", { cause: "history" });
        },
      },
      {
        id: "harm",
        title: "Regenerates both keys",
        reasoning: "missed",
        drive: (c) => {
          run(c, "hist");
          run(c, "both");
          run(c, "verify");
          waitUntil(c, 161);
          close(c);
          c.act("document", { cause: "history" });
        },
      },
      {
        id: "noop",
        title: "Commits a deletion",
        reasoning: "partial",
        drive: (c) => {
          run(c, "hist");
          run(c, "delete");
          run(c, "verify");
          waitUntil(c, 161);
          close(c);
          c.act("document", { cause: "history" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads history and the key, rotates and rewrites, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "hist");
          run(c, "live");
          run(c, "scrub");
          run(c, "verify");
          waitUntil(c, 161);
          close(c);
          c.act("document", { cause: "history" });
        },
      },
      {
        id: "late",
        title: "Waits, scrubs after 16:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "hist");
          waitUntil(c, 160);
          run(c, "scrub");
          run(c, "verify");
          waitUntil(c, 168);
          close(c);
          c.act("document", { cause: "history" });
        },
      },
      {
        id: "blind",
        title: "Scrubs without looking and blames the scanner",
        reasoning: "missed",
        drive: (c) => {
          run(c, "scrub");
          waitUntil(c, 161);
          close(c);
          c.act("document", { cause: "scanner" });
        },
      },
    ],
  };
}
