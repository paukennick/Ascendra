// REQ-237: golden paths for the Linux+ full-/var outage on the terminal
// screen (LINUXPLUS/full-var-stops-database.sim.json). No prototype exists,
// so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "LINUXPLUS", slug: "full-var-stops-database" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "df and du disagree, lsof +L1 finds shopd holding the deleted log, journal read, log level back to info, restart shopd, start PostgreSQL, health check",
        reasoning: "met",
        drive: (c) => {
          run(c, "df");
          run(c, "du");
          run(c, "lsof");
          run(c, "pgJournal");
          run(c, "logLevel");
          run(c, "debugOff");
          run(c, "restartShopd");
          run(c, "startPg");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "openDeleted", prevent: "loglevel" });
        },
      },
      {
        id: "startFirst",
        title: "Starts PostgreSQL twice on a full disk, then finds the open deleted log and fixes it; never reads the journal first, leaves debug logging on",
        reasoning: "partial",
        drive: (c) => {
          run(c, "startPg");
          run(c, "startPg");
          run(c, "df");
          run(c, "du");
          run(c, "lsof");
          run(c, "restartShopd");
          run(c, "startPg");
          run(c, "pgJournal");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "openDeleted", prevent: "grow" });
        },
      },
      {
        id: "deleteLogs",
        title: "Deletes every log under /var/log for space (180 MB, still full), the start fails again, and closes blaming inodes with the database still down",
        reasoning: "missed",
        drive: (c) => {
          run(c, "df");
          run(c, "rmLogs");
          run(c, "startPg");
          run(c, "du");
          close(c);
          c.act("document", { cause: "inodes", prevent: "grow" });
        },
      },
      {
        id: "deleteWal",
        title: "Reads the journal, then deletes PostgreSQL's WAL to make room: the database will not start again",
        reasoning: "missed",
        drive: (c) => {
          run(c, "df");
          run(c, "pgJournal");
          run(c, "rmWal");
          run(c, "startPg");
          run(c, "restartShopd");
          run(c, "startPg");
          close(c);
          c.act("document", { cause: "failingDisk", prevent: "grow" });
        },
      },
      {
        id: "slowSync",
        title: "Investigates slowly and waits: the 09:45 warehouse sync fails before the database is back",
        reasoning: "partial",
        drive: (c) => {
          run(c, "df");
          run(c, "pgStatus");
          run(c, "pgJournal");
          waitUntil(c, 46);
          run(c, "du");
          run(c, "lsof");
          run(c, "debugOff");
          run(c, "restartShopd");
          run(c, "startPg");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "openDeleted", prevent: "loglevel" });
        },
      },
      {
        id: "luckyRestart",
        title: "Restarts shopd on a hunch (space comes back), starts PostgreSQL, edits the log level without restarting; never finds the holder, records a failing disk",
        reasoning: "partial",
        drive: (c) => {
          run(c, "df");
          run(c, "restartShopd");
          run(c, "startPg");
          run(c, "debugOff");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "failingDisk", prevent: "nothing" });
        },
      },
    ],
  };
}
