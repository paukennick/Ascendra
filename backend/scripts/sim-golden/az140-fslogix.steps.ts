// REQ-320: golden paths for AZ140/fslogix-share-missing-share-permission on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AZ140", slug: "fslogix-share-missing-share-permission" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "FSLogix log, port 445, share-level access, NTFS, Contributor granted, temporary sessions signed out, test sign-in",
        reasoning: "met",
        drive: (c) => {
          run(c, "fslogixLog");
          run(c, "port");
          run(c, "rbac");
          run(c, "ntfs");
          run(c, "grant", {"w": "users"});
          waitUntil(c, 11);
          run(c, "logoff");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "rbac" });
        },
      },
      {
        id: "lockout",
        title: "Turns on PreventLoginWithFailure",
        reasoning: "missed",
        drive: (c) => {
          run(c, "fslogixLog");
          run(c, "preventLogin");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "rbac" });
        },
      },
      {
        id: "restartHosts",
        title: "Tests the network and restarts the hosts",
        reasoning: "missed",
        drive: (c) => {
          run(c, "port");
          run(c, "restart");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "network" });
        },
      },
      {
        id: "elevated",
        title: "Finds the gap and grants Elevated Contributor, tests, leaves the temporary sessions",
        reasoning: "partial",
        drive: (c) => {
          run(c, "fslogixLog");
          run(c, "rbac");
          run(c, "grant", {"w": "elevated"});
          waitUntil(c, 11);
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "rbac" });
        },
      },
      {
        id: "late",
        title: "Restarts the hosts and waits, then finds and fixes the access after 08:25",
        reasoning: "partial",
        drive: (c) => {
          run(c, "restart");
          waitUntil(c, 40);
          run(c, "fslogixLog");
          run(c, "rbac");
          run(c, "grant", {"w": "users"});
          waitUntil(c, 46);
          run(c, "verify");
          close(c);
          c.act("document", { cause: "rbac" });
        },
      },
      {
        id: "blind",
        title: "Sets the default share permission without reading anything or testing",
        reasoning: "missed",
        drive: (c) => {
          run(c, "grant", {"w": "default"});
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "ntfs" });
        },
      },
    ],
  };
}
