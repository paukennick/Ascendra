// REQ-297: golden paths for the Linux+ systemd drop-in outage on the terminal
// screen (LINUXPLUS/systemd-dropin-breaks-export.sim.json). Each command costs
// a minute through the `work` wait, so the console's shared driver steps
// apply. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec, Ctl } from "./steps.ts";
import { task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "LINUXPLUS", slug: "systemd-dropin-breaks-export" };

function close(c: Ctl): void {
  if (c.run.state.phase === "incident") c.act("closeOutage");
  c.answer();
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "status, journal and cat; systemctl edit the drop-in, start, enable, check the file",
        reasoning: "met",
        drive: (c) => {
          task(c, "status");
          task(c, "journal");
          task(c, "cat");
          task(c, "fix", { change: "systemctlEdit" });
          task(c, "start");
          task(c, "enable");
          task(c, "watch");
          task(c, "ls");
          close(c);
          c.act("document", { cause: "dropin" });
        },
      },
      {
        id: "rmNoEnable",
        title: "Removes the drop-in by hand, needs a daemon-reload, and leaves the unit disabled",
        reasoning: "partial",
        drive: (c) => {
          task(c, "status");
          task(c, "journal");
          task(c, "cat");
          task(c, "fix", { change: "rmDropin" });
          task(c, "start");
          task(c, "reload");
          task(c, "start");
          task(c, "watch");
          task(c, "ls");
          close(c);
          c.act("document", { cause: "dropin" });
        },
      },
      {
        id: "vendorFirst",
        title: "Edits the vendor unit file first, then finds the drop-in and fixes it",
        reasoning: "partial",
        drive: (c) => {
          task(c, "status");
          task(c, "fix", { change: "editVendor" });
          task(c, "reload");
          task(c, "start");
          task(c, "journal");
          task(c, "cat");
          task(c, "fix", { change: "systemctlEdit" });
          task(c, "start");
          task(c, "enable");
          task(c, "watch");
          task(c, "ls");
          close(c);
          c.act("document", { cause: "dropin" });
        },
      },
      {
        id: "mkdirOld",
        title: "Creates /srv/export-old so the service starts; the file goes where the bank never looks",
        reasoning: "missed",
        drive: (c) => {
          task(c, "journal");
          task(c, "fix", { change: "mkdirOld" });
          task(c, "start");
          watchUntil(c, 46);
          close(c);
          c.act("document", { cause: "disk" });
        },
      },
      {
        id: "reboot",
        title: "Reboots the server and closes",
        reasoning: "missed",
        drive: (c) => {
          task(c, "status");
          task(c, "reboot");
          close(c);
          c.act("document", { cause: "binary" });
        },
      },
    ],
  };
}
