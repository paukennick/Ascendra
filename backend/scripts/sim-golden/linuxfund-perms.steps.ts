// REQ-292: golden paths for the Linux Fundamentals shared-folder ticket on
// the terminal screen (LINUXFUND/shared-folder-permission-denied.sim.json).
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "LINUXFUND", slug: "shared-folder-permission-denied" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "ps shows nora's session without print, ls -l shows the files' groups; new login, chgrp, g+w, setgid and sticky, then a test file as nora",
        reasoning: "met",
        drive: (c) => {
          run(c, "idNora");
          run(c, "psNora");
          run(c, "lsl");
          run(c, "relog");
          run(c, "chgrp");
          run(c, "groupWrite");
          run(c, "setgid");
          run(c, "sticky");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "groups", fix: "group" });
        },
      },
      {
        id: "noSetgid",
        title: "Asks nora to log in again before looking, fixes the files' group and write bit, never sets setgid or checks a new file",
        reasoning: "partial",
        drive: (c) => {
          run(c, "relog");
          run(c, "psNora");
          run(c, "lsl");
          run(c, "chgrp");
          run(c, "groupWrite");
          close(c);
          c.act("document", { cause: "groups", fix: "group" });
        },
      },
      {
        id: "open777",
        title: "Sees Permission denied and opens the folder to everyone",
        reasoning: "missed",
        drive: (c) => {
          run(c, "lsd");
          run(c, "open777");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "groups", fix: "open" });
        },
      },
      {
        id: "replaceGroups",
        title: "Re-adds nora with usermod -G (dropping design), then fixes the folder properly",
        reasoning: "partial",
        drive: (c) => {
          run(c, "psNora");
          run(c, "lsl");
          run(c, "replaceGroups");
          run(c, "relog");
          run(c, "chgrp");
          run(c, "groupWrite");
          run(c, "setgid");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "groups", fix: "group" });
        },
      },
      {
        id: "lateRun",
        title: "Waits for nora to retry, misses the 11:00 run, then fixes it properly",
        reasoning: "partial",
        drive: (c) => {
          run(c, "idNora");
          waitUntil(c, 41);
          run(c, "psNora");
          run(c, "lsl");
          run(c, "relog");
          run(c, "chgrp");
          run(c, "groupWrite");
          run(c, "setgid");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "groups", fix: "group" });
        },
      },
      {
        id: "givesUp",
        title: "Sees id nora lists print and closes the ticket as a disk problem",
        reasoning: "missed",
        drive: (c) => {
          run(c, "idNora");
          close(c);
          c.act("document", { cause: "disk", fix: "reinstall" });
        },
      },
    ],
  };
}
