// REQ-335: golden paths for DP300/log-backup-job-failing-expired-sas on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "DP300", slug: "log-backup-job-failing-expired-sas" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Reuse wait, job history, credential, notifications; new SAS and run; alerts; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "reuse");
          run(c, "hist");
          run(c, "cred");
          run(c, "notify");
          run(c, "newsas");
          run(c, "alert");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "sas" });
        },
      },
      {
        id: "harm",
        title: "Switches billing to SIMPLE and shrinks",
        reasoning: "missed",
        drive: (c) => {
          run(c, "reuse");
          run(c, "simple");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "sas" });
        },
      },
      {
        id: "noop",
        title: "Restarts SQL Server Agent",
        reasoning: "partial",
        drive: (c) => {
          run(c, "reuse");
          run(c, "agent");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "sas" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads the wait and history, fixes the credential, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "reuse");
          run(c, "hist");
          run(c, "newsas");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "sas" });
        },
      },
      {
        id: "late",
        title: "Waits, fixes after the drive fills",
        reasoning: "partial",
        drive: (c) => {
          run(c, "reuse");
          waitUntil(c, 45);
          run(c, "newsas");
          run(c, "verify");
          waitUntil(c, 53);
          close(c);
          c.act("document", { cause: "sas" });
        },
      },
      {
        id: "blind",
        title: "Fixes the credential without looking and blames the disk",
        reasoning: "missed",
        drive: (c) => {
          run(c, "newsas");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "disk" });
        },
      },
    ],
  };
}
