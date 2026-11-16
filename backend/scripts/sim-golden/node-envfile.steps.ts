// REQ-269: golden paths for the TypeScript & Node.js silent-exit outage on
// the terminal screen (TSNODE/node-env-file-silent-exit.sim.json). No
// prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "TSNODE", slug: "node-env-file-silent-exit" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "status (exit 0), journal (SMTP_URL missing), unit and /etc/notifier show the renamed file; --env-file, daemon-reload, restart, queue drains; 3.8.1 exits 1 on a missing setting",
        reasoning: "met",
        drive: (c) => {
          run(c, "status");
          run(c, "journal");
          run(c, "catUnit");
          run(c, "lsEtc");
          run(c, "editEnvFile");
          run(c, "reload");
          run(c, "restart");
          run(c, "depth");
          run(c, "grepCode");
          run(c, "patchExit");
          close(c);
          c.act("document", { cause: "envName", prevent: "loud" });
        },
      },
      {
        id: "quietFix",
        title: "Restarts blind first, then reads the journal, fixes the file name but keeps --env-file-if-exists, forgets daemon-reload once; mail flows, still silent next time",
        reasoning: "partial",
        drive: (c) => {
          run(c, "restart");
          run(c, "journal");
          run(c, "lsEtc");
          run(c, "editIfExists");
          run(c, "restart");
          run(c, "reload");
          run(c, "restart");
          run(c, "depth");
          close(c);
          c.act("document", { cause: "envName", prevent: "restartAlways" });
        },
      },
      {
        id: "purge",
        title: "Purges the 'stuck' queue, then finds and fixes the file",
        reasoning: "missed",
        drive: (c) => {
          run(c, "status");
          run(c, "purgeQueue");
          run(c, "journal");
          run(c, "catUnit");
          run(c, "lsEtc");
          run(c, "editEnvFile");
          run(c, "reload");
          run(c, "restart");
          close(c);
          c.act("document", { cause: "smtpDown", prevent: "nothing" });
        },
      },
      {
        id: "blindRestarts",
        title: "Restarts twice, blames the SMTP relay and closes with the notifier stopped",
        reasoning: "missed",
        drive: (c) => {
          run(c, "restart");
          run(c, "restart");
          run(c, "status");
          close(c);
          c.act("document", { cause: "smtpDown", prevent: "nothing" });
        },
      },
      {
        id: "slowPatch",
        title: "Reads everything, ships the exit-code patch first and waits on it; 15:02 passes before the unit is fixed",
        reasoning: "partial",
        drive: (c) => {
          run(c, "status");
          run(c, "journal");
          run(c, "grepCode");
          run(c, "patchExit");
          waitUntil(c, 30);
          run(c, "catUnit");
          run(c, "lsEtc");
          run(c, "editEnvFile");
          run(c, "reload");
          run(c, "restart");
          run(c, "depth");
          close(c);
          c.act("document", { cause: "envName", prevent: "loud" });
        },
      },
    ],
  };
}
