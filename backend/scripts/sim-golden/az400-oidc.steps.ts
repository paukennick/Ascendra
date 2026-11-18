// REQ-335: golden paths for AZ400/oidc-deploy-fails-after-environment-rename on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AZ400", slug: "oidc-deploy-fails-after-environment-rename" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Log, credentials, rename, protections; new credential; code and CI; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "log");
          run(c, "fic");
          run(c, "rename");
          run(c, "rules");
          run(c, "addfic");
          run(c, "iac");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "subject" });
        },
      },
      {
        id: "harm",
        title: "Stores a client secret",
        reasoning: "missed",
        drive: (c) => {
          run(c, "log");
          run(c, "secret");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "subject" });
        },
      },
      {
        id: "noop",
        title: "Re-runs the workflow",
        reasoning: "partial",
        drive: (c) => {
          run(c, "log");
          run(c, "rerun");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "subject" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads log and credentials, adds the credential, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "log");
          run(c, "fic");
          run(c, "addfic");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "subject" });
        },
      },
      {
        id: "late",
        title: "Waits, fixes after 16:30",
        reasoning: "partial",
        drive: (c) => {
          run(c, "log");
          waitUntil(c, 80);
          run(c, "addfic");
          run(c, "verify");
          waitUntil(c, 88);
          close(c);
          c.act("document", { cause: "subject" });
        },
      },
      {
        id: "blind",
        title: "Adds a credential without looking and blames GitHub",
        reasoning: "missed",
        drive: (c) => {
          run(c, "addfic");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "rbac" });
        },
      },
    ],
  };
}
