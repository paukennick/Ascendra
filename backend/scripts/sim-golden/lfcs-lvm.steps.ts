// REQ-292: golden paths for the LFCS full database volume on the terminal
// screen (LFCS/lvm-database-volume-full.sim.json). No prototype exists, so
// the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "LFCS", slug: "lvm-database-volume-full" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "df, vgs (no free space) and lsblk (the new disk), then pvcreate and vgextend with vdc, lvextend -r, and df to prove it",
        reasoning: "met",
        drive: (c) => {
          run(c, "df");
          run(c, "vgs");
          run(c, "lsblk");
          run(c, "pvcreateNew");
          run(c, "vgextend");
          run(c, "lvextendR");
          run(c, "df");
          close(c);
          c.act("document", { cause: "full", fix: "grow" });
        },
      },
      {
        id: "twoStep",
        title: "Tries lvextend before reading anything (no space), then vgextend, lvextend without -r, resize2fs on XFS, then xfs_growfs; never checks df",
        reasoning: "partial",
        drive: (c) => {
          run(c, "lvextend");
          run(c, "vgs");
          run(c, "lsblk");
          run(c, "vgextend");
          run(c, "lvextend");
          run(c, "resize2fs");
          run(c, "xfsGrowfs");
          close(c);
          c.act("document", { cause: "full", fix: "lvonly" });
        },
      },
      {
        id: "forceWrongDisk",
        title: "Runs pvcreate -ff on /dev/vdb, the disk that holds vg_data, then cannot extend the group",
        reasoning: "missed",
        drive: (c) => {
          run(c, "df");
          run(c, "pvcreateForce");
          run(c, "vgextend");
          close(c);
          c.act("document", { cause: "full", fix: "newpv" });
        },
      },
      {
        id: "lateImport",
        title: "Watches the volume until after 10:30, then grows it correctly once the import has failed",
        reasoning: "partial",
        drive: (c) => {
          run(c, "df");
          waitUntil(c, 26);
          run(c, "vgs");
          run(c, "lsblk");
          run(c, "vgextend");
          run(c, "lvextendR");
          run(c, "df");
          close(c);
          c.act("document", { cause: "full", fix: "grow" });
        },
      },
      {
        id: "lvOnly",
        title: "Extends the logical volume without the filesystem, closes thinking it is done",
        reasoning: "missed",
        drive: (c) => {
          run(c, "vgs");
          run(c, "lsblk");
          run(c, "vgextend");
          run(c, "lvextend");
          close(c);
          c.act("document", { cause: "disk", fix: "lvonly" });
        },
      },
    ],
  };
}
