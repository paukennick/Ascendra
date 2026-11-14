// REQ-292: golden paths for the Linux Fundamentals nginx outage on the
// terminal screen (LINUXFUND/web-service-fails-after-edit.sim.json). No
// prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "LINUXFUND", slug: "web-service-fails-after-edit" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "status and journal name line 31, the line above lacks a semicolon; fix, nginx -t passes, restart, enable, curl",
        reasoning: "met",
        drive: (c) => {
          run(c, "status");
          run(c, "journal");
          run(c, "showLine");
          run(c, "fixLine");
          run(c, "nginxT");
          run(c, "restart");
          run(c, "enable");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "syntax", fix: "semicolon" });
        },
      },
      {
        id: "notEnabled",
        title: "Restarts twice blindly, then reads the journal, fixes the line and restarts without testing; never enables nginx",
        reasoning: "partial",
        drive: (c) => {
          run(c, "restart");
          run(c, "restart");
          run(c, "journal");
          run(c, "fixLine");
          run(c, "restart");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "syntax", fix: "semicolon" });
        },
      },
      {
        id: "removeSite",
        title: "Removes the shop's site so nginx starts, and enables it",
        reasoning: "missed",
        drive: (c) => {
          run(c, "status");
          run(c, "removeSite");
          run(c, "nginxT");
          run(c, "restart");
          run(c, "enable");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "syntax", fix: "removed" });
        },
      },
      {
        id: "reinstallLate",
        title: "Reinstalls nginx and waits, then finds the semicolon after the 09:45 cutoff",
        reasoning: "partial",
        drive: (c) => {
          run(c, "reinstall");
          waitUntil(c, 41);
          run(c, "journal");
          run(c, "fixLine");
          run(c, "nginxT");
          run(c, "restart");
          run(c, "enable");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "package", fix: "reinstall" });
        },
      },
      {
        id: "givesUp",
        title: "Restarts once, sees it fail and closes blaming the package",
        reasoning: "missed",
        drive: (c) => {
          run(c, "restart");
          close(c);
          c.act("document", { cause: "package", fix: "reinstall" });
        },
      },
    ],
  };
}
