// REQ-335: golden paths for GCPSEC/cmek-old-version-scheduled-for-destruction on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPSEC", slug: "cmek-old-version-scheduled-for-destruction" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Versions, error, audit, script; restore and enable; limit janitor; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "versions");
          run(c, "err");
          run(c, "audit");
          run(c, "script");
          run(c, "restore");
          run(c, "guard");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "versions" });
        },
      },
      {
        id: "harm",
        title: "Makes the BigQuery agent KMS admin",
        reasoning: "missed",
        drive: (c) => {
          run(c, "versions");
          run(c, "adminagent");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "versions" });
        },
      },
      {
        id: "noop",
        title: "Re-runs on a bigger reservation",
        reasoning: "partial",
        drive: (c) => {
          run(c, "versions");
          run(c, "rerun");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "versions" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads versions and error, restores, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "versions");
          run(c, "err");
          run(c, "restore");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "versions" });
        },
      },
      {
        id: "late",
        title: "Waits, restores after 10:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "versions");
          waitUntil(c, 80);
          run(c, "restore");
          run(c, "verify");
          waitUntil(c, 88);
          close(c);
          c.act("document", { cause: "versions" });
        },
      },
      {
        id: "blind",
        title: "Restores without looking and blames IAM",
        reasoning: "missed",
        drive: (c) => {
          run(c, "restore");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "iam" });
        },
      },
    ],
  };
}
