// REQ-292: golden paths for the Python automation log case on the terminal
// screen (PYAUTO/debug-log-fills-var.sim.json). No prototype exists, so the
// expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "PYAUTO", slug: "debug-log-fills-var" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "df and du (sync.log 14 GB), truncate the open log, RotatingFileHandler 50 MB x 5 at INFO, restart, see sync.log.1",
        reasoning: "met",
        drive: (c) => {
          run(c, "df");
          run(c, "du");
          run(c, "truncate");
          run(c, "grepConf");
          run(c, "editRot");
          run(c, "restart");
          run(c, "lsLogs");
          close(c);
          c.act("document", { cause: "debuglog", fix: "rotate" });
        },
      },
      {
        id: "fixBeforeLooking",
        title: "Truncates sync.log straight away (before du), then sets up RotatingFileHandler and restarts; never checks that it rolls over",
        reasoning: "partial",
        drive: (c) => {
          run(c, "truncate");
          run(c, "df");
          run(c, "du");
          run(c, "grepConf");
          run(c, "editRot");
          run(c, "restart");
          close(c);
          c.act("document", { cause: "debuglog", fix: "rotate" });
        },
      },
      {
        id: "rmThenRestart",
        title: "Deletes the log (df unchanged: still held open), restarts invsync to free it, and leaves the FileHandler as it was",
        reasoning: "partial",
        drive: (c) => {
          run(c, "du");
          run(c, "rmLog");
          run(c, "df");
          run(c, "lsof");
          run(c, "restart");
          close(c);
          c.act("document", { cause: "debuglog", fix: "deleted" });
        },
      },
      {
        id: "zeroBackup",
        title: "Truncates in time, then sets maxBytes but leaves backupCount at 0, so it never rolls over",
        reasoning: "partial",
        drive: (c) => {
          run(c, "df");
          run(c, "du");
          run(c, "truncate");
          run(c, "grepConf");
          run(c, "editZero");
          run(c, "restart");
          run(c, "lsLogs");
          close(c);
          c.act("document", { cause: "debuglog", fix: "zero" });
        },
      },
      {
        id: "rmOnly",
        title: "Deletes the log without looking and waits: the space stays held and /var fills",
        reasoning: "missed",
        drive: (c) => {
          run(c, "rmLog");
          waitUntil(c, 13);
          close(c);
          c.act("document", { cause: "disk", fix: "deleted" });
        },
      },
      {
        id: "noRestart",
        title: "Edits the handler correctly but never frees the space or restarts, and closes",
        reasoning: "missed",
        drive: (c) => {
          run(c, "du");
          run(c, "grepConf");
          run(c, "editRot");
          close(c);
          c.act("document", { cause: "debuglog", fix: "rotate" });
        },
      },
    ],
  };
}
