// REQ-292: golden paths for the LFCS invoicer case on the terminal screen
// (LFCS/service-no-restart-after-update.sim.json). No prototype exists, so
// the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "LFCS", slug: "service-no-restart-after-update" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "status, journal (the PDF it died on) and systemctl cat (no Restart=); quarantine the PDF, systemctl edit, start, show -p Restart",
        reasoning: "met",
        drive: (c) => {
          run(c, "status");
          run(c, "journal");
          run(c, "cat");
          run(c, "quarantine");
          run(c, "edit");
          run(c, "start");
          run(c, "showRestart");
          close(c);
          c.act("document", { cause: "upgrade", fix: "dropin" });
        },
      },
      {
        id: "vendorEdit",
        title: "Puts Restart= back in the vendor file under /usr/lib and reloads; quarantines the PDF and starts",
        reasoning: "partial",
        drive: (c) => {
          run(c, "status");
          run(c, "cat");
          run(c, "editVendor");
          run(c, "daemonReload");
          run(c, "quarantine");
          run(c, "start");
          run(c, "showRestart");
          close(c);
          c.act("document", { cause: "upgrade", fix: "vendor" });
        },
      },
      {
        id: "noReload",
        title: "Copies the prepared drop-in but never runs daemon-reload; show -p Restart still says no",
        reasoning: "partial",
        drive: (c) => {
          run(c, "journal");
          run(c, "quarantine");
          run(c, "copyDropin");
          run(c, "start");
          run(c, "showRestart");
          close(c);
          c.act("document", { cause: "upgrade", fix: "dropin" });
        },
      },
      {
        id: "purge",
        title: "Clears the whole inbox to get past the crash, then adds the drop-in and starts",
        reasoning: "missed",
        drive: (c) => {
          run(c, "status");
          run(c, "purge");
          run(c, "edit");
          run(c, "start");
          run(c, "showRestart");
          close(c);
          c.act("document", { cause: "package", fix: "purge" });
        },
      },
      {
        id: "startTwice",
        title: "Starts it twice without looking; it crashes on the same PDF each time",
        reasoning: "missed",
        drive: (c) => {
          run(c, "start");
          run(c, "start");
          close(c);
          c.act("document", { cause: "package", fix: "vendor" });
        },
      },
      {
        id: "late",
        title: "Starts it blind, waits past the batch, then reads the journal and does the rest right",
        reasoning: "partial",
        drive: (c) => {
          run(c, "start");
          waitUntil(c, 31);
          run(c, "journal");
          run(c, "quarantine");
          run(c, "edit");
          run(c, "start");
          run(c, "showRestart");
          close(c);
          c.act("document", { cause: "upgrade", fix: "dropin" });
        },
      },
    ],
  };
}
