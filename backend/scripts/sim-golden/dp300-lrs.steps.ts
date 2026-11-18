// REQ-335: golden paths for DP300/lrs-cutover-tail-backup-not-restored on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "DP300", slug: "lrs-cutover-tail-backup-not-restored" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "LRS status, blob files, source history, script; move and complete; runbook; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "status");
          run(c, "files");
          run(c, "src");
          run(c, "script");
          run(c, "move");
          run(c, "runbook");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "folder" });
        },
      },
      {
        id: "harm",
        title: "Completes without the tail",
        reasoning: "missed",
        drive: (c) => {
          run(c, "status");
          run(c, "complete");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "folder" });
        },
      },
      {
        id: "noop",
        title: "Re-uploads with the same script",
        reasoning: "partial",
        drive: (c) => {
          run(c, "status");
          run(c, "reupload");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "folder" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads LRS status and files, moves and completes, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "status");
          run(c, "files");
          run(c, "move");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "folder" });
        },
      },
      {
        id: "late",
        title: "Waits, moves after 23:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "status");
          waitUntil(c, 40);
          run(c, "move");
          run(c, "verify");
          waitUntil(c, 48);
          close(c);
          c.act("document", { cause: "folder" });
        },
      },
      {
        id: "blind",
        title: "Moves the file without looking and blames corruption",
        reasoning: "missed",
        drive: (c) => {
          run(c, "move");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "corrupt" });
        },
      },
    ],
  };
}
