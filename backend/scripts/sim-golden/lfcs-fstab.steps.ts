// REQ-292: golden paths for the LFCS boot-to-emergency-mode outage on the
// terminal screen (LFCS/fstab-uuid-typo-emergency.sim.json). No prototype
// exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "LFCS", slug: "fstab-uuid-typo-emergency" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Reads the boot journal, compares fstab with blkid, remounts rw, fixes the UUID, reloads, tests with mount -a, continues the boot, checks health",
        reasoning: "met",
        drive: (c) => {
          run(c, "journal");
          run(c, "fstab");
          run(c, "blkid");
          run(c, "remountRw");
          run(c, "fixUuid");
          run(c, "daemonReload");
          run(c, "mountA");
          run(c, "continueBoot");
          run(c, "health");
          close(c);
          c.act("document", { cause: "uuid", fix: "uuid" });
        },
      },
      {
        id: "noReload",
        title: "Edits on a read-only root first, fixes the UUID but continues the boot without daemon-reload (it fails again), then reloads and boots, testing the mount only afterward",
        reasoning: "partial",
        drive: (c) => {
          run(c, "fstab");
          run(c, "fixUuid");
          run(c, "blkid");
          run(c, "remountRw");
          run(c, "fixUuid");
          run(c, "continueBoot");
          run(c, "remountRw");
          run(c, "daemonReload");
          run(c, "continueBoot");
          run(c, "mountA");
          run(c, "health");
          close(c);
          c.act("document", { cause: "uuid", fix: "uuid" });
        },
      },
      {
        id: "commentOut",
        title: "Comments the /srv/survey line out to get a login, reloads and boots: uploads land on the root filesystem",
        reasoning: "missed",
        drive: (c) => {
          run(c, "journal");
          run(c, "remountRw");
          run(c, "commentOut");
          run(c, "daemonReload");
          run(c, "continueBoot");
          run(c, "health");
          close(c);
          c.act("document", { cause: "uuid", fix: "comment" });
        },
      },
      {
        id: "repairLog",
        title: "Assumes a damaged filesystem and zeroes the healthy disk's XFS log, then finds and fixes the typo",
        reasoning: "missed",
        drive: (c) => {
          run(c, "xfsRepairL");
          run(c, "journal");
          run(c, "remountRw");
          run(c, "fixUuid");
          run(c, "daemonReload");
          run(c, "mountA");
          run(c, "continueBoot");
          close(c);
          c.act("document", { cause: "disk", fix: "repair" });
        },
      },
      {
        id: "slowCrews",
        title: "Reboots twice hoping it clears, waits, and fixes the typo after the 08:30 uploads have failed",
        reasoning: "partial",
        drive: (c) => {
          run(c, "reboot");
          run(c, "reboot");
          waitUntil(c, 39);
          run(c, "journal");
          run(c, "remountRw");
          run(c, "fixUuid");
          run(c, "daemonReload");
          run(c, "continueBoot");
          run(c, "mountA");
          close(c);
          c.act("document", { cause: "uuid", fix: "uuid" });
        },
      },
      {
        id: "givesUp",
        title: "Blames the root filesystem, looks at lsblk and closes with the host still in emergency mode",
        reasoning: "missed",
        drive: (c) => {
          run(c, "lsblk");
          close(c);
          c.act("document", { cause: "root", fix: "repair" });
        },
      },
    ],
  };
}
