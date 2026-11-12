// REQ-237: golden paths for the Linux+ SELinux 403 after a move on the
// terminal screen (LINUXPLUS/selinux-denies-moved-site.sim.json). No
// prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "LINUXPLUS", slug: "selinux-denies-moved-site" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Confirms the 403, reads the error log, ls -l fine, ls -Z and ausearch show user_home_t denied, restorecon -Rv, verifies 200",
        reasoning: "met",
        drive: (c) => {
          run(c, "curl");
          run(c, "errLog");
          run(c, "lsl");
          run(c, "lsZ");
          run(c, "avc");
          run(c, "restorecon");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "label", fix: "restorecon" });
        },
      },
      {
        id: "permissive",
        title: "Sets SELinux permissive at once: the site works, and the server is left permissive at close",
        reasoning: "partial",
        drive: (c) => {
          run(c, "curl");
          run(c, "errLog");
          run(c, "setenforce0");
          run(c, "curl");
          run(c, "avc");
          close(c);
          c.act("document", { cause: "label", fix: "permissive" });
        },
      },
      {
        id: "chmodThenFix",
        title: "Opens the files to 777 and restarts httpd (still 403), then finds the label, relabels and puts the permissions back",
        reasoning: "partial",
        drive: (c) => {
          run(c, "curl");
          run(c, "lsl");
          run(c, "chmod777");
          run(c, "curl");
          run(c, "restartHttpd");
          run(c, "lsZ");
          run(c, "avc");
          run(c, "restorecon");
          run(c, "chmodBack");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "label", fix: "restorecon" });
        },
      },
      {
        id: "disable",
        title: "Reads the denial, then disables SELinux from the next boot and goes permissive meanwhile",
        reasoning: "missed",
        drive: (c) => {
          run(c, "errLog");
          run(c, "avc");
          run(c, "disableSelinux");
          run(c, "setenforce0");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "mode", fix: "permissive" });
        },
      },
      {
        id: "slowLaunch",
        title: "Restarts httpd and waits on the developer: the 10:45 email goes out to a 403, then relabels",
        reasoning: "partial",
        drive: (c) => {
          run(c, "curl");
          run(c, "errLog");
          run(c, "restartHttpd");
          run(c, "lsl");
          waitUntil(c, 46);
          run(c, "lsZ");
          run(c, "restorecon");
          run(c, "curl");
          close(c);
          c.act("document", { cause: "label", fix: "restorecon" });
        },
      },
      {
        id: "givesUp",
        title: "Sees fine permissions, restarts httpd and closes blaming ownership with the site still failing",
        reasoning: "missed",
        drive: (c) => {
          run(c, "curl");
          run(c, "lsl");
          run(c, "restartHttpd");
          close(c);
          c.act("document", { cause: "owner", fix: "chmod" });
        },
      },
    ],
  };
}
