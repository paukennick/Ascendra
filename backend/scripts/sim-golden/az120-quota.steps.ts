// REQ-335: golden paths for AZ120/migration-wave-blocked-by-vm-family-quota on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AZ120", slug: "migration-wave-blocked-by-vm-family-quota" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Error, usage, sizing, requests; request quota; later waves; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "err");
          run(c, "usage");
          run(c, "plan");
          run(c, "support");
          run(c, "request");
          run(c, "checklist");
          run(c, "verify");
          waitUntil(c, 151);
          close(c);
          c.act("document", { cause: "quota" });
        },
      },
      {
        id: "harm",
        title: "Deploys HANA in North Europe",
        reasoning: "missed",
        drive: (c) => {
          run(c, "err");
          run(c, "region");
          run(c, "verify");
          waitUntil(c, 151);
          close(c);
          c.act("document", { cause: "quota" });
        },
      },
      {
        id: "noop",
        title: "Re-runs the deployment",
        reasoning: "partial",
        drive: (c) => {
          run(c, "err");
          run(c, "retry");
          run(c, "verify");
          waitUntil(c, 151);
          close(c);
          c.act("document", { cause: "quota" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads the error and usage, requests, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "err");
          run(c, "usage");
          run(c, "request");
          run(c, "verify");
          waitUntil(c, 151);
          close(c);
          c.act("document", { cause: "quota" });
        },
      },
      {
        id: "late",
        title: "Waits, requests after 18:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "err");
          waitUntil(c, 150);
          run(c, "request");
          run(c, "verify");
          waitUntil(c, 158);
          close(c);
          c.act("document", { cause: "quota" });
        },
      },
      {
        id: "blind",
        title: "Requests without looking and blames the regional total",
        reasoning: "missed",
        drive: (c) => {
          run(c, "request");
          waitUntil(c, 151);
          close(c);
          c.act("document", { cause: "regional" });
        },
      },
    ],
  };
}
