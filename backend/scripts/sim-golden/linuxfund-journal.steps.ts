// REQ-292: golden paths for the Linux Fundamentals missing-backup case on
// the terminal screen (LINUXFUND/nightly-backup-missing.sim.json). No
// prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "LINUXFUND", slug: "nightly-backup-missing" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "journalctl -b -1 -p err (the refused mount at 01:30), fix the credentials, mount, run the backup job, df",
        reasoning: "met",
        drive: (c) => {
          run(c, "prevErr");
          run(c, "fixCred");
          run(c, "mount");
          run(c, "startBackup");
          waitUntil(c, 26);
          run(c, "df");
          close(c);
          c.act("document", { cause: "password", fix: "mounted" });
        },
      },
      {
        id: "pagingLate",
        title: "Pages the whole journal twice, checks this boot's errors, lists boots, then finds it by unit and fixes it after 08:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "everything");
          run(c, "everything");
          run(c, "bootErr");
          run(c, "listBoots");
          waitUntil(c, 30);
          run(c, "unitSince");
          run(c, "fixCred");
          run(c, "mount");
          run(c, "startBackup");
          waitUntil(c, 60);
          run(c, "df");
          close(c);
          c.act("document", { cause: "password", fix: "mounted" });
        },
      },
      {
        id: "rsyncUnmounted",
        title: "Sees no errors in this boot and copies the files with rsync into the unmounted /mnt/backup",
        reasoning: "missed",
        drive: (c) => {
          run(c, "bootErr");
          run(c, "rsyncManual");
          run(c, "df");
          close(c);
          c.act("document", { cause: "reboot", fix: "local" });
        },
      },
      {
        id: "rerunOnly",
        title: "Blames the reboot, reruns the job (refused: not mounted), and closes",
        reasoning: "missed",
        drive: (c) => {
          run(c, "startBackup");
          close(c);
          c.act("document", { cause: "reboot", fix: "rerun" });
        },
      },
      {
        id: "guessFirst",
        title: "Fixes the credentials on the handover's hint before reading anything, then reads the journal, mounts and copies with rsync",
        reasoning: "partial",
        drive: (c) => {
          run(c, "fixCred");
          run(c, "unitSince");
          run(c, "mount");
          run(c, "rsyncManual");
          waitUntil(c, 20);
          close(c);
          c.act("document", { cause: "password", fix: "local" });
        },
      },
    ],
  };
}
